import json
import sqlite3
from datetime import datetime

from config import JSON_FILE, SQL_FILE

KEEP_GPX_DUPLICATE_NAME = "gpx from keep"
KEEP_DUPLICATE_SECONDS = 5
KEEP_DUPLICATE_DISTANCE_RATIO = 0.08


def is_gpx_from_keep(activity):
    return str(activity.get("name", "")).strip().lower() == KEEP_GPX_DUPLICATE_NAME


def is_canonical_keep(activity):
    name = str(activity.get("name", "")).strip().lower()
    return name.endswith(" from keep") and name != KEEP_GPX_DUPLICATE_NAME


def are_same_keep_activity(left, right):
    if str(left.get("type", "")).strip().lower() != str(
        right.get("type", "")
    ).strip().lower():
        return False

    left_start = datetime.strptime(left["start_date_local"], "%Y-%m-%d %H:%M:%S")
    right_start = datetime.strptime(right["start_date_local"], "%Y-%m-%d %H:%M:%S")
    if abs((left_start - right_start).total_seconds()) > KEEP_DUPLICATE_SECONDS:
        return False

    left_distance = float(left.get("distance") or 0)
    right_distance = float(right.get("distance") or 0)
    baseline = max(left_distance, right_distance, 1.0)
    return abs(left_distance - right_distance) / baseline <= (
        KEEP_DUPLICATE_DISTANCE_RATIO
    )


def dedupe_keep_gpx_activities(activities):
    deduped = []

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


def cleanup_database():
    conn = sqlite3.connect(SQL_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    rows = cursor.execute(
        """
        SELECT run_id, name, distance, type, start_date_local
        FROM activities
        WHERE type != ''
        ORDER BY start_date_local
        """
    ).fetchall()

    activities = [dict(row) for row in rows]
    deduped = dedupe_keep_gpx_activities(activities)
    deduped_ids = {activity["run_id"] for activity in deduped}
    removed_ids = [
        activity["run_id"]
        for activity in activities
        if activity["run_id"] not in deduped_ids and is_gpx_from_keep(activity)
    ]

    if removed_ids:
        cursor.executemany(
            "DELETE FROM activities WHERE run_id = ?",
            [(run_id,) for run_id in removed_ids],
        )
        conn.commit()

    conn.close()
    return removed_ids


def cleanup_json():
    with open(JSON_FILE) as f:
        activities = json.load(f)

    deduped = dedupe_keep_gpx_activities(activities)

    with open(JSON_FILE, "w") as f:
        json.dump(deduped, f)


if __name__ == "__main__":
    removed_ids = cleanup_database()
    cleanup_json()
    print(f"Removed {len(removed_ids)} duplicate Keep GPX activities.")
