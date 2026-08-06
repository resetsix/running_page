import os
import warnings
from collections.abc import Sequence
from typing import TypeAlias

import polyline
from haversine import haversine

Coordinate: TypeAlias = tuple[float, float]

# Initialize IGNORE_POLYLINE with graceful error handling
IGNORE_POLYLINE = []
ignore_polyline_env = os.getenv("IGNORE_POLYLINE")
if ignore_polyline_env:
    try:
        IGNORE_POLYLINE = polyline.decode(ignore_polyline_env)
    except Exception as e:
        warnings.warn(
            f"IGNORE_POLYLINE is not a valid polyline: {e}. "
            "Privacy filtering for specific polylines will be disabled.",
            UserWarning,
        )
        IGNORE_POLYLINE = []

# Initialize IGNORE_RANGE and IGNORE_START_END_RANGE with graceful error handling
IGNORE_RANGE = 0.0
IGNORE_START_END_RANGE = 0.0

ignore_range_env = os.getenv("IGNORE_RANGE", "0")
ignore_start_end_range_env = os.getenv("IGNORE_START_END_RANGE", "0")

try:
    IGNORE_RANGE = int(ignore_range_env) / 1000
except ValueError:
    warnings.warn(
        f"IGNORE_RANGE is not a valid number: '{ignore_range_env}'. "
        "Using default value of 0. Privacy filtering by range will be disabled.",
        UserWarning,
    )
    IGNORE_RANGE = 0.0

try:
    IGNORE_START_END_RANGE = int(ignore_start_end_range_env) / 1000
except ValueError:
    warnings.warn(
        f"IGNORE_START_END_RANGE is not a valid number: '{ignore_start_end_range_env}'. "
        "Using default value of 0. Start/end point filtering will be disabled.",
        UserWarning,
    )
    IGNORE_START_END_RANGE = 0.0


def point_distance_in_range(
    point: Coordinate, center_point: Coordinate, distance: float
) -> bool:
    return haversine(point, center_point) < distance


def point_in_list_points_range(
    point: Coordinate, points: Sequence[Coordinate], distance: float
) -> bool:
    # Use generator expression instead of list comprehension for better performance
    return any(point_distance_in_range(point, p, distance) for p in points)


def range_hiding(
    polyline: Sequence[Coordinate],
    points: Sequence[Coordinate],
    distance: float,
) -> list[Coordinate]:
    segments = range_hiding_segments(polyline, points, distance)
    if not segments:
        return []
    return max(segments, key=_segment_length)


def _segment_length(segment: Sequence[Coordinate]) -> float:
    return sum(haversine(left, right) for left, right in zip(segment, segment[1:]))


def range_hiding_segments(
    polyline: Sequence[Coordinate],
    points: Sequence[Coordinate],
    distance: float,
) -> list[list[Coordinate]]:
    """Return retained contiguous route segments without bridging privacy gaps."""

    if distance <= 0 or not points:
        return [list(polyline)] if polyline else []

    segments: list[list[Coordinate]] = []
    current: list[Coordinate] = []
    for point in polyline:
        if point_in_list_points_range(point, points, distance):
            if len(current) >= 2:
                segments.append(current)
            current = []
            continue
        current.append(point)

    if len(current) >= 2:
        segments.append(current)
    return segments


def start_end_hiding(
    polyline: Sequence[Coordinate], distance: float
) -> list[Coordinate]:
    if distance <= 0:
        return list(polyline)

    start_index, end_index = 0, len(polyline) - 1

    starting_distance = 0
    for i in range(1, len(polyline)):
        starting_distance += haversine(polyline[i], polyline[i - 1])
        if starting_distance > distance:
            start_index = i
            break

    ending_distance = 0
    for i in range(len(polyline) - 2, -1, -1):
        ending_distance += haversine(polyline[i], polyline[i + 1])
        if ending_distance > distance:
            end_index = i
            break

    if start_index >= end_index:
        return []

    return list(polyline[start_index : end_index + 1])


def filter_out(polyline_str):
    if not polyline_str:
        return
    pl = polyline.decode(polyline_str)
    if not pl:
        return polyline_str

    new_pl = start_end_hiding(pl, IGNORE_START_END_RANGE)
    new_pl = range_hiding(new_pl, IGNORE_POLYLINE, IGNORE_RANGE)

    if not new_pl:
        return
    return polyline.encode(new_pl)
