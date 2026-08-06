#!/usr/bin/env python3
"""Repair activity routes damaged by repeated export-time privacy filtering.

The command is dry-run by default. Pass ``--apply`` to update ``data.db`` and
the known malformed GPX file. Existing activity statistics are preserved,
except for the explicitly repaired elevation gain on 2021-07-19.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path
from xml.etree import ElementTree as ET

import polyline

from config import GPX_FOLDER, JSON_FILE, SQL_FILE

REPO_ROOT = Path(__file__).resolve().parent.parent
ACTIVITIES_PATH = Path(JSON_FILE).relative_to(REPO_ROOT).as_posix()
TARGET_RUN_ID = 9223370410147145137
TARGET_GPX_NAME = f"{TARGET_RUN_ID}.gpx"
TARGET_FIRST_ELEVATION = "1489.06"
TARGET_SPIKE_BLOCK = """      <trkpt lat="27.883694919932296" lon="102.24264192185514">
        <ele>1492.28</ele>
        <time>2021-07-19T15:01:18Z</time>
      </trkpt>
"""


def run_git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=REPO_ROOT)


def load_earliest_activity_records(run_ids: set[int]) -> dict[int, dict]:
    """Return the first committed JSON record for each requested activity."""
    commits = (
        run_git("rev-list", "--reverse", "--all", "--", ACTIVITIES_PATH)
        .decode()
        .splitlines()
    )
    earliest: dict[int, dict] = {}

    for commit in commits:
        if len(earliest) == len(run_ids):
            break
        try:
            raw = run_git("show", f"{commit}:{ACTIVITIES_PATH}")
            activities = json.loads(raw)
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue

        for activity in activities:
            try:
                run_id = int(activity["run_id"])
            except (KeyError, TypeError, ValueError):
                continue
            if run_id in run_ids and run_id not in earliest:
                earliest[run_id] = activity

    return earliest


def repair_target_gpx_text(text: str) -> str:
    """Correct the known bad first elevation and isolated GPS spike."""
    first_elevation = "        <ele>0.0</ele>"
    if first_elevation in text:
        text = text.replace(
            first_elevation,
            f"        <ele>{TARGET_FIRST_ELEVATION}</ele>",
            1,
        )

    spike_count = text.count(TARGET_SPIKE_BLOCK)
    if spike_count > 1:
        raise ValueError("target GPX spike block matched more than once")
    if spike_count == 1:
        text = text.replace(TARGET_SPIKE_BLOCK, "", 1)
    return text


def parse_gpx_points(text: str) -> list[tuple[float, float, float | None]]:
    root = ET.fromstring(text)
    points = []
    for point in root.findall(".//{*}trkpt"):
        elevation = point.findtext("{*}ele")
        points.append(
            (
                float(point.attrib["lat"]),
                float(point.attrib["lon"]),
                float(elevation) if elevation is not None else None,
            )
        )
    if len(points) < 2:
        raise ValueError("GPX must contain at least two track points")
    return points


def elevation_gain(points: list[tuple[float, float, float | None]]) -> float:
    gain = 0.0
    for left, right in zip(points, points[1:]):
        if left[2] is None or right[2] is None:
            continue
        gain += max(0.0, right[2] - left[2])
    return gain


def route_from_gpx(path: Path, repair_target: bool) -> tuple[str, str, float | None]:
    original_text = path.read_text(encoding="utf-8")
    repaired_text = (
        repair_target_gpx_text(original_text) if repair_target else original_text
    )
    points = parse_gpx_points(repaired_text)
    route = polyline.encode([(point[0], point[1]) for point in points])
    gain = elevation_gain(points) if repair_target else None
    return route, repaired_text, gain


def backup_database(db_path: Path) -> Path:
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = Path(tempfile.gettempdir()) / f"running-page-data-{timestamp}.db"
    shutil.copy2(db_path, backup)
    return backup


def repair(apply: bool) -> int:
    db_path = Path(SQL_FILE)
    gpx_dir = Path(GPX_FOLDER)
    target_gpx_path = gpx_dir / TARGET_GPX_NAME

    with sqlite3.connect(db_path) as connection:
        rows = connection.execute(
            "SELECT run_id, summary_polyline, subtype, elevation_gain FROM activities"
        ).fetchall()
        run_ids = {int(row[0]) for row in rows}
        earliest = load_earliest_activity_records(run_ids)

        route_updates: list[tuple[str, int]] = []
        subtype_updates: list[tuple[str, int]] = []
        source_counts = {"gpx": 0, "git-history": 0, "unchanged": 0}
        repaired_target_text = None
        repaired_target_gain = None

        for run_id, current_route, current_subtype, _ in rows:
            run_id = int(run_id)
            gpx_path = gpx_dir / f"{run_id}.gpx"
            restored_route = None

            if gpx_path.exists():
                restored_route, repaired_text, repaired_gain = route_from_gpx(
                    gpx_path, run_id == TARGET_RUN_ID
                )
                source_counts["gpx"] += 1
                if run_id == TARGET_RUN_ID:
                    repaired_target_text = repaired_text
                    repaired_target_gain = repaired_gain
            else:
                historic = earliest.get(run_id) or {}
                restored_route = historic.get("summary_polyline")
                if restored_route:
                    source_counts["git-history"] += 1

            if restored_route and restored_route != (current_route or ""):
                route_updates.append((restored_route, run_id))
            else:
                source_counts["unchanged"] += 1

            historic_record = earliest.get(run_id)
            historic_subtype = (
                historic_record.get("subtype") if historic_record is not None else None
            )
            if (
                str(current_subtype or "").lower() == "indoor"
                and historic_record is not None
                and str(historic_subtype).lower() != "indoor"
            ):
                subtype_updates.append((str(historic_subtype or ""), run_id))

        if repaired_target_gain is None or repaired_target_text is None:
            raise RuntimeError("target GPX was not found and repaired")

        print(f"Activities in database: {len(rows)}")
        print(f"Routes sourced from GPX: {source_counts['gpx']}")
        print(f"Routes sourced from Git history: {source_counts['git-history']}")
        print(f"Route updates required: {len(route_updates)}")
        print(f"Subtype updates required: {len(subtype_updates)}")
        print(f"Repaired target elevation gain: {repaired_target_gain:.1f} m")

        if not apply:
            print("Dry run only; pass --apply to write changes.")
            return 0

        backup = backup_database(db_path)
        print(f"Database backup: {backup}")

        connection.executemany(
            "UPDATE activities SET summary_polyline = ? WHERE run_id = ?",
            route_updates,
        )
        connection.executemany(
            "UPDATE activities SET subtype = ? WHERE run_id = ?",
            subtype_updates,
        )
        connection.execute(
            "UPDATE activities SET elevation_gain = ? WHERE run_id = ?",
            (repaired_target_gain, TARGET_RUN_ID),
        )
        connection.commit()

    target_gpx_path.write_text(repaired_target_text, encoding="utf-8")
    print("Repair applied successfully.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write the repaired routes to data.db and update the target GPX",
    )
    args = parser.parse_args()
    return repair(args.apply)


if __name__ == "__main__":
    raise SystemExit(main())
