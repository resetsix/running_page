import datetime
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import polyline

import generator as generator_module
from generator.db import Activity
import gpxtrackposter.track as track_module
from repair_route_regression import (
    TARGET_SPIKE_BLOCK,
    elevation_gain,
    parse_gpx_points,
    repair_target_gpx_text,
)


class GeneratorLoadPurityTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "activities.db"
        self.generator = generator_module.Generator(str(self.db_path))

    def tearDown(self):
        self.generator.session.close()
        self.temp_dir.cleanup()

    def add_activity(
        self,
        run_id,
        start_date_local,
        summary_polyline,
        subtype="Run",
        distance=1_000.0,
    ):
        activity = Activity(
            run_id=run_id,
            name="Test activity",
            distance=distance,
            moving_time=datetime.timedelta(minutes=5),
            elapsed_time=datetime.timedelta(minutes=5),
            type="Run",
            subtype=subtype,
            start_date=start_date_local,
            start_date_local=start_date_local,
            location_country="Test location",
            summary_polyline=summary_polyline,
            average_speed=3.0,
            elevation_gain=10.0,
        )
        self.generator.session.add(activity)
        self.generator.session.commit()

    def read_route_fields(self, run_id):
        with sqlite3.connect(self.db_path) as connection:
            return connection.execute(
                "SELECT summary_polyline, subtype FROM activities WHERE run_id = ?",
                (run_id,),
            ).fetchone()

    def test_privacy_filter_changes_export_without_mutating_database(self):
        raw_route = polyline.encode([(30.0, 104.0), (30.01, 104.01)])
        filtered_route = polyline.encode([(30.001, 104.001), (30.009, 104.009)])
        self.add_activity(1, "2026-01-01 08:00:00", raw_route)

        with (
            mock.patch.object(generator_module, "IGNORE_BEFORE_SAVING", False),
            mock.patch.object(
                generator_module, "filter_out", return_value=filtered_route
            ),
        ):
            first_export = self.generator.load()
            second_export = self.generator.load()

        self.assertEqual(filtered_route, first_export[0]["summary_polyline"])
        self.assertEqual(first_export, second_export)
        self.assertEqual((raw_route, "Run"), self.read_route_fields(1))

    def test_indoor_route_derivation_is_export_only(self):
        outdoor_route = polyline.encode(
            [(30.0, 104.0), (30.005, 104.005), (30.0, 104.0)]
        )
        self.add_activity(1, "2026-01-01 08:00:00", outdoor_route)
        self.add_activity(
            2,
            "2026-01-02 08:00:00",
            "",
            subtype="VirtualRun",
            distance=800.0,
        )

        with (
            mock.patch.object(generator_module, "IGNORE_BEFORE_SAVING", False),
            mock.patch.object(
                generator_module, "filter_out", side_effect=lambda value: value
            ),
        ):
            exported = self.generator.load()

        indoor_export = exported[1]
        self.assertEqual("indoor", indoor_export["subtype"])
        self.assertTrue(indoor_export["summary_polyline"])
        self.assertEqual(("", "VirtualRun"), self.read_route_fields(2))


class TargetGpxRepairTest(unittest.TestCase):
    def test_known_elevation_and_gps_spike_are_removed(self):
        repo_root = Path(__file__).resolve().parent.parent
        gpx_path = repo_root / "GPX_OUT" / "9223370410147145137.gpx"
        original = gpx_path.read_text(encoding="utf-8")

        repaired = repair_target_gpx_text(original)
        original_points = parse_gpx_points(original)
        repaired_points = parse_gpx_points(repaired)

        self.assertNotIn(TARGET_SPIKE_BLOCK, repaired)
        expected_removed_points = 1 if TARGET_SPIKE_BLOCK in original else 0
        self.assertEqual(
            len(original_points) - expected_removed_points, len(repaired_points)
        )
        self.assertEqual(repaired, repair_target_gpx_text(repaired))
        self.assertEqual(1489.06, repaired_points[0][2])
        self.assertAlmostEqual(112.2, elevation_gain(repaired_points), places=1)


class DatabaseTrackPrivacyTest(unittest.TestCase):
    def test_raw_database_route_is_filtered_for_svg_loading(self):
        raw_route = polyline.encode([(30.0, 104.0), (30.01, 104.01)])
        filtered_route = polyline.encode([(30.001, 104.001), (30.009, 104.009)])
        activity = SimpleNamespace(
            run_id=1,
            start_date_local="2026-01-01 08:00:00",
            elapsed_time=datetime.timedelta(minutes=5),
            moving_time=datetime.timedelta(minutes=5),
            distance=1_000.0,
            average_speed=3.0,
            type="Run",
            subtype="Run",
            summary_polyline=raw_route,
        )

        with (
            mock.patch.object(track_module, "IGNORE_BEFORE_SAVING", False),
            mock.patch.object(
                track_module, "filter_out", return_value=filtered_route
            ) as privacy_filter,
        ):
            track = track_module.Track()
            track.load_from_db(activity)

        privacy_filter.assert_called_once_with(raw_route)
        self.assertEqual(2, len(track.polylines[0]))


if __name__ == "__main__":
    unittest.main()
