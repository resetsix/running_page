import json
import sqlite3
from datetime import datetime
from typing import Any, TypeAlias

from config import JSON_FILE, SQL_FILE

Activity: TypeAlias = dict[str, Any]

KEEP_GPX_DUPLICATE_NAME = "gpx from keep"
KEEP_DUPLICATE_SECONDS = 5
KEEP_DUPLICATE_DISTANCE_RATIO = 0.08
START_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def is_gpx_from_keep(activity: Activity) -> bool:
    return str(activity.get("name", "")).strip().lower() == KEEP_GPX_DUPLICATE_NAME


def is_canonical_keep(activity: Activity) -> bool:
    name = str(activity.get("name", "")).strip().lower()
    return name.endswith(" from keep") and name != KEEP_GPX_DUPLICATE_NAME


def activity_distance(activity: Activity) -> float:
    return float(activity.get("distance") or 0.0)


def are_same_keep_activity(left: Activity, right: Activity) -> bool:
    left_type = str(left.get("type", "")).strip().lower()
    right_type = str(right.get("type", "")).strip().lower()
    if left_type != right_type:
        return False

    left_start = datetime.strptime(str(left["start_date_local"]), START_DATE_FORMAT)
    right_start = datetime.strptime(str(right["start_date_local"]), START_DATE_FORMAT)
    seconds_apart = abs((left_start - right_start).total_seconds())
    if seconds_apart > KEEP_DUPLICATE_SECONDS:
        return False

    left_distance = activity_distance(left)
    right_distance = activity_distance(right)
    baseline = max(left_distance, right_distance, 1.0)
    distance_ratio = abs(left_distance - right_distance) / baseline
    return distance_ratio <= KEEP_DUPLICATE_DISTANCE_RATIO


def dedupe_keep_gpx_activities(activities: list[Activity]) -> list[Activity]:
    deduped: list[Activity] = []

    for activity in activities:
        duplicate_index = next(
            (
                index
                for index, candidate in enumerate(deduped)
                if are_same_keep_activity(candidate, activity)
                and (
                    (is_canonical_keep(candidate) and is_gpx_from_keep(activity))
                    or (is_gpx_from_keep(candidate) and is_canonical_keep(activity))
                )
            ),
            -1,
        )

        if duplicate_index == -1:
            deduped.append(activity)
            continue

        if is_canonical_keep(activity) and is_gpx_from_keep(deduped[duplicate_index]):
            deduped[duplicate_index] = activity

    return deduped


def cleanup_database() -> list[int]:
    conn = sqlite3.connect(SQL_FILE)
    cursor = conn.cursor()

    rows = cursor.execute("""
        SELECT run_id, name, distance, type, start_date_local
        FROM activities
        WHERE type != ''
        ORDER BY start_date_local
        """).fetchall()

    activities: list[Activity] = [
        {
            "run_id": int(run_id),
            "name": name,
            "distance": distance,
            "type": activity_type,
            "start_date_local": start_date_local,
        }
        for run_id, name, distance, activity_type, start_date_local in rows
    ]
    deduped = dedupe_keep_gpx_activities(activities)
    deduped_ids = {int(activity["run_id"]) for activity in deduped}
    removed_ids = [
        int(activity["run_id"])
        for activity in activities
        if int(activity["run_id"]) not in deduped_ids and is_gpx_from_keep(activity)
    ]

    if removed_ids:
        cursor.executemany(
            "DELETE FROM activities WHERE run_id = ?",
            [(run_id,) for run_id in removed_ids],
        )
        conn.commit()

    conn.close()
    return removed_ids


def cleanup_json() -> None:
    with open(JSON_FILE, mode="r", encoding="utf-8") as file:
        activities = json.load(file)

    if not isinstance(activities, list):
        raise TypeError(f"Expected {JSON_FILE} to contain a JSON list")

    deduped = dedupe_keep_gpx_activities(activities)

    with open(JSON_FILE, mode="w", encoding="utf-8") as file:
        json.dump(deduped, file)


if __name__ == "__main__":
    removed_ids = cleanup_database()
    cleanup_json()
    print(f"Removed {len(removed_ids)} duplicate Keep GPX activities.")
