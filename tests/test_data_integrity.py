import datetime
import os
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import generator as generator_module
import polyline
import polyline_processor
from audit_activity_data import audit_database, embedded_location
from env_utils import env_bool
from generator.db import (
    Activity,
    are_same_keep_activity,
    cleanup_keep_gpx_duplicates,
    init_db,
    update_or_create_activity,
)


@dataclass
class MapStub:
    summary_polyline: str


@dataclass
class ActivityStub:
    id: int
    run_id: int
    name: str
    distance: float
    moving_time: datetime.timedelta
    elapsed_time: datetime.timedelta
    type: str
    subtype: str
    start_date: str
    start_date_local: str
    start_latlng: None
    location_country: str
    average_heartrate: float
    average_speed: float
    elevation_gain: float | None
    map: MapStub
    summary_polyline: str


def activity_stub(
    *,
    run_id: int,
    name: str,
    start: str,
    route: str,
    distance: float = 5_000.0,
    activity_type: str = "Run",
) -> ActivityStub:
    return ActivityStub(
        id=run_id,
        run_id=run_id,
        name=name,
        distance=distance,
        moving_time=datetime.timedelta(minutes=30),
        elapsed_time=datetime.timedelta(minutes=32),
        type=activity_type,
        subtype=activity_type,
        start_date=start,
        start_date_local=start,
        start_latlng=None,
        location_country="Test location",
        average_heartrate=140.0,
        average_speed=3.0,
        elevation_gain=10.0,
        map=MapStub(summary_polyline=route),
        summary_polyline=route,
    )


class EnvironmentBooleanTest(unittest.TestCase):
    def test_explicit_boolean_values(self) -> None:
        for value in ("1", "true", "TRUE", "yes", "on"):
            with (
                self.subTest(value=value),
                mock.patch.dict(os.environ, {"TEST_BOOLEAN": value}),
            ):
                self.assertTrue(env_bool("TEST_BOOLEAN"))
        for value in ("", "0", "false", "False", "no", "off"):
            with (
                self.subTest(value=value),
                mock.patch.dict(os.environ, {"TEST_BOOLEAN": value}),
            ):
                self.assertFalse(env_bool("TEST_BOOLEAN", default=True))

    def test_unknown_value_uses_default(self) -> None:
        with mock.patch.dict(os.environ, {"TEST_BOOLEAN": "unexpected"}):
            self.assertTrue(env_bool("TEST_BOOLEAN", default=True))


class KeepGpxDedupeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "activities.db"
        self.session = init_db(str(self.db_path))
        self.full_route = polyline.encode(
            [(30.0, 104.0), (30.01, 104.01), (30.02, 104.02), (30.03, 104.03)]
        )

    def tearDown(self) -> None:
        self.session.close()
        self.temp_dir.cleanup()

    def test_delayed_partial_route_is_duplicate(self) -> None:
        canonical = activity_stub(
            run_id=9223370000000000001,
            name="Running from keep",
            start="2025-05-14 19:29:42",
            route=self.full_route,
            distance=5_000,
        )
        partial = activity_stub(
            run_id=1747223166000,
            name="gpx from keep",
            start="2025-05-14 19:46:06",
            route=polyline.encode([(30.01, 104.01), (30.02, 104.02)]),
            distance=1_500,
        )
        self.assertTrue(are_same_keep_activity(canonical, partial))

    def test_similar_time_but_different_route_is_not_duplicate(self) -> None:
        canonical = activity_stub(
            run_id=1,
            name="Running from keep",
            start="2025-05-14 19:29:42",
            route=self.full_route,
        )
        separate = activity_stub(
            run_id=2,
            name="gpx from keep",
            start="2025-05-14 19:35:00",
            route=polyline.encode([(31.0, 105.0), (31.02, 105.02)]),
        )
        self.assertFalse(are_same_keep_activity(canonical, separate))

    def test_cleanup_removes_gpx_record_and_preserves_canonical_record(self) -> None:
        canonical = Activity(
            run_id=9223370000000000001,
            name="Running from keep",
            distance=5_000,
            type="Run",
            start_date_local="2025-05-14 19:29:42",
            summary_polyline=self.full_route,
        )
        duplicate = Activity(
            run_id=1747223166000,
            name="gpx from keep",
            distance=1_500,
            type="Run",
            start_date_local="2025-05-14 19:46:06",
            summary_polyline=polyline.encode([(30.01, 104.01), (30.02, 104.02)]),
        )
        self.session.add_all([canonical, duplicate])
        self.session.commit()

        removed = cleanup_keep_gpx_duplicates(self.session)
        self.session.commit()

        self.assertEqual([1747223166000], removed)
        self.assertIsNotNone(self.session.get(Activity, canonical.run_id))
        self.assertIsNone(self.session.get(Activity, duplicate.run_id))


class ActivityUpdateTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "activities.db"
        self.session = init_db(str(self.db_path))

    def tearDown(self) -> None:
        self.session.close()
        self.temp_dir.cleanup()

    def test_existing_activity_refreshes_dates_without_erasing_location(self) -> None:
        route = polyline.encode([(30.0, 104.0), (30.01, 104.01)])
        existing = Activity(
            run_id=100,
            name="Old",
            distance=1_000,
            moving_time=datetime.timedelta(minutes=5),
            elapsed_time=datetime.timedelta(minutes=5),
            type="Run",
            subtype="Run",
            start_date="2025-01-01 08:00:00",
            start_date_local="2025-01-01 08:00:00",
            location_country="Existing location",
            summary_polyline=route,
            average_speed=3.0,
            elevation_gain=42.0,
        )
        self.session.add(existing)
        self.session.commit()
        incoming = activity_stub(
            run_id=100,
            name="Updated",
            start="2025-01-01 08:01:00",
            route=route,
            distance=1_050,
        )
        incoming.location_country = ""
        incoming.elevation_gain = None

        update_or_create_activity(self.session, incoming)
        self.session.commit()

        refreshed = self.session.get(Activity, 100)
        self.assertIsNotNone(refreshed)
        assert refreshed is not None
        self.assertEqual("2025-01-01 08:01:00", refreshed.start_date)
        self.assertEqual("2025-01-01 08:01:00", refreshed.start_date_local)
        self.assertEqual("Existing location", refreshed.location_country)
        self.assertEqual(42.0, refreshed.elevation_gain)
        self.assertEqual("100", refreshed.to_dict()["run_id"])


class SyncFromAppTest(unittest.TestCase):
    def test_namedtuple_like_file_names_are_logged(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            generator = generator_module.Generator(
                str(Path(temp_dir) / "activities.db")
            )
            track = SimpleNamespace(file_names=["activity.gpx"])

            with (
                mock.patch.object(
                    generator_module, "update_or_create_activity", return_value=True
                ),
                mock.patch.object(
                    generator_module, "save_synced_data_file_list"
                ) as save_files,
            ):
                generator.sync_from_app([track])

            save_files.assert_called_once_with(["activity.gpx"])
            generator.session.close()


class PrivacyFilterTest(unittest.TestCase):
    def test_zero_distances_leave_route_unchanged(self) -> None:
        points = [(30.0, 104.0), (30.01, 104.01), (30.02, 104.02)]
        self.assertEqual(points, polyline_processor.start_end_hiding(points, 0))
        self.assertEqual(
            points,
            polyline_processor.range_hiding(points, [(30.01, 104.01)], 0),
        )

    def test_privacy_gap_keeps_longest_contiguous_segment(self) -> None:
        points = [
            (30.0, 104.0),
            (30.001, 104.001),
            (30.01, 104.01),
            (30.02, 104.02),
            (30.03, 104.03),
        ]
        retained = polyline_processor.range_hiding(points, [(30.01, 104.01)], 0.05)
        self.assertEqual(points[3:], retained)
        self.assertNotIn(points[1], retained)


class AuditTest(unittest.TestCase):
    def test_location_parser_ignores_zero_start_coordinates(self) -> None:
        value = str(
            {
                "latitude": 30.5,
                "longitude": 104.1,
                "startLatitude": 0.0,
                "startLongitude": 0.0,
            }
        )
        self.assertEqual((30.5, 104.1), embedded_location(value))

    def test_audit_detects_jump_and_does_not_mutate_database(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "activities.db"
            session = init_db(str(db_path))
            session.add(
                Activity(
                    run_id=1,
                    name="Test",
                    distance=1_000,
                    type="Run",
                    start_date_local="2025-01-01 08:00:00",
                    location_country="",
                    summary_polyline=polyline.encode([(30.0, 104.0), (31.0, 105.0)]),
                )
            )
            session.commit()
            session.close()

            result = audit_database(db_path)
            categories = {finding.category for finding in result.findings}

            self.assertIn("GPS 跳点", categories)
            self.assertIn("地点缺失", categories)
            verify = init_db(str(db_path))
            self.assertEqual(1, verify.query(Activity).count())
            verify.close()


if __name__ == "__main__":
    unittest.main()
