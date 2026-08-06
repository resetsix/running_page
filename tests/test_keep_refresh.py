import unittest
from types import SimpleNamespace
from unittest import mock

import keep_sync


class RefreshIdParsingTest(unittest.TestCase):
    def test_parse_refresh_ids(self) -> None:
        self.assertEqual({"111", "222"}, keep_sync.parse_refresh_ids("111, 222,111"))
        self.assertEqual(set(), keep_sync.parse_refresh_ids(""))

    def test_parse_refresh_ids_rejects_non_numeric_values(self) -> None:
        with self.assertRaisesRegex(ValueError, "invalid Keep activity ID"):
            keep_sync.parse_refresh_ids("111,not-an-id")


class KeepRefreshSelectionTest(unittest.TestCase):
    def setUp(self) -> None:
        self.session = object()
        self.headers = {"Authorization": "Bearer test"}
        self.available_runs = ["user_111_rn", "user_222_rn"]

    def run_get_all(self, refresh_ids=None):
        parsed_track = SimpleNamespace(run_id=111)
        with (
            mock.patch.object(keep_sync.requests, "Session", return_value=self.session),
            mock.patch.object(
                keep_sync, "login", return_value=(self.session, self.headers)
            ),
            mock.patch.object(
                keep_sync,
                "get_to_download_runs_ids",
                return_value=self.available_runs,
            ),
            mock.patch.object(
                keep_sync, "get_single_run_data", return_value={"data": {}}
            ) as get_single,
            mock.patch.object(
                keep_sync, "parse_raw_data_to_nametuple", return_value=parsed_track
            ),
        ):
            tracks = keep_sync.get_all_keep_tracks(
                "mobile",
                "password",
                ["111"],
                ["running"],
                refresh_ids=refresh_ids,
            )
        return tracks, get_single

    def test_normal_sync_skips_existing_ids(self) -> None:
        tracks, get_single = self.run_get_all()

        self.assertEqual(1, len(tracks))
        get_single.assert_called_once_with(
            self.session, self.headers, "user_222_rn", "running"
        )

    def test_refresh_only_fetches_requested_existing_id(self) -> None:
        tracks, get_single = self.run_get_all({"111"})

        self.assertEqual(1, len(tracks))
        get_single.assert_called_once_with(
            self.session, self.headers, "user_111_rn", "running"
        )

    def test_refresh_fails_before_fetch_when_id_is_missing(self) -> None:
        with (
            mock.patch.object(keep_sync.requests, "Session", return_value=self.session),
            mock.patch.object(
                keep_sync, "login", return_value=(self.session, self.headers)
            ),
            mock.patch.object(
                keep_sync,
                "get_to_download_runs_ids",
                return_value=self.available_runs,
            ),
            mock.patch.object(keep_sync, "get_single_run_data") as get_single,
        ):
            with self.assertRaisesRegex(ValueError, "333"):
                keep_sync.get_all_keep_tracks(
                    "mobile",
                    "password",
                    ["111"],
                    ["running"],
                    refresh_ids={"333"},
                )

        get_single.assert_not_called()


if __name__ == "__main__":
    unittest.main()
