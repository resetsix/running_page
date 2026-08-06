#!/usr/bin/env python3
"""Audit activity routes and metadata without modifying source data."""

from __future__ import annotations

import argparse
import ast
import datetime as dt
from dataclasses import dataclass, field
from pathlib import Path
from xml.etree import ElementTree as ET

import polyline

from config import GPX_FOLDER, SQL_FILE
from generator.db import (
    Activity,
    _distance_m,
    _find_keep_duplicate_matches,
    init_db,
    is_gpx_from_keep_activity,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT = REPO_ROOT / "reports" / "route-anomalies.md"
ROUTE_RATIO_MIN = 0.8
ROUTE_RATIO_MAX = 1.2
JUMP_THRESHOLD_METERS = 500
LOCATION_MISMATCH_METERS = 10_000
SPEED_THRESHOLD_MPS = 20


@dataclass(order=True)
class Finding:
    date: str
    run_id: str
    category: str
    severity: str
    details: str
    source: str = "database"
    recommendation: str = "人工核对原始轨迹后再决定是否修改"


@dataclass
class AuditResult:
    activity_count: int = 0
    gpx_count: int = 0
    findings: list[Finding] = field(default_factory=list)
    duplicate_ids: list[str] = field(default_factory=list)


def route_metrics(
    encoded: str | None,
) -> tuple[float, float, tuple[float, float] | None]:
    if not encoded:
        return 0.0, 0.0, None
    try:
        points = polyline.decode(encoded)
    except (TypeError, ValueError):
        return 0.0, 0.0, None
    if not points:
        return 0.0, 0.0, None
    distances = [_distance_m(left, right) for left, right in zip(points, points[1:])]
    centroid = (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )
    return sum(distances), max(distances, default=0.0), centroid


def embedded_location(value: str | None) -> tuple[float, float] | None:
    if not value or not value.lstrip().startswith("{"):
        return None
    try:
        parsed = ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return None
    if not isinstance(parsed, dict):
        return None
    candidates = (
        (parsed.get("startLatitude"), parsed.get("startLongitude")),
        (parsed.get("latitude"), parsed.get("longitude")),
    )
    for latitude, longitude in candidates:
        try:
            point = float(latitude), float(longitude)
        except (TypeError, ValueError):
            continue
        if point != (0.0, 0.0) and -90 <= point[0] <= 90 and -180 <= point[1] <= 180:
            return point
    return None


def audit_database(db_path: Path) -> AuditResult:
    result = AuditResult()
    session = init_db(str(db_path))
    try:
        activities = session.query(Activity).order_by(Activity.start_date_local).all()
        result.activity_count = len(activities)
        for activity in activities:
            run_id = str(activity.run_id)
            date = str(activity.start_date_local or "")[:10]
            route_length, max_jump, centroid = route_metrics(activity.summary_polyline)

            if activity.distance and route_length:
                ratio = route_length / float(activity.distance)
                if ratio < ROUTE_RATIO_MIN or ratio > ROUTE_RATIO_MAX:
                    result.findings.append(
                        Finding(
                            date,
                            run_id,
                            "路线长度比例",
                            "中",
                            f"路线长度/活动距离为 {ratio:.2f}",
                        )
                    )
            if max_jump > JUMP_THRESHOLD_METERS:
                result.findings.append(
                    Finding(
                        date,
                        run_id,
                        "GPS 跳点",
                        "高",
                        f"最大相邻点跳跃约 {max_jump:.0f} 米",
                    )
                )

            location_point = embedded_location(activity.location_country)
            if centroid and location_point:
                mismatch = _distance_m(centroid, location_point)
                if mismatch > LOCATION_MISMATCH_METERS:
                    result.findings.append(
                        Finding(
                            date,
                            run_id,
                            "地点与路线不一致",
                            "中",
                            f"地点坐标与路线中心相距约 {mismatch / 1000:.1f} 公里",
                        )
                    )
            if not str(activity.location_country or "").strip():
                result.findings.append(
                    Finding(
                        date,
                        run_id,
                        "地点缺失",
                        "低",
                        "location_country 为空",
                        recommendation="保留为空或人工补录；不要自动联网反向地理编码",
                    )
                )

        for activity in activities:
            if not is_gpx_from_keep_activity(activity):
                continue
            if _find_keep_duplicate_matches(session, activity, "keep"):
                result.duplicate_ids.append(str(activity.run_id))
    finally:
        session.close()
    return result


def parse_gpx(path: Path):
    root = ET.parse(path).getroot()
    points = []
    for node in root.findall(".//{*}trkpt"):
        time_text = node.findtext("{*}time")
        timestamp = None
        if time_text:
            try:
                timestamp = dt.datetime.fromisoformat(time_text.replace("Z", "+00:00"))
            except ValueError:
                pass
        points.append((float(node.attrib["lat"]), float(node.attrib["lon"]), timestamp))
    return points


def audit_gpx(result: AuditResult, gpx_dir: Path) -> None:
    for path in sorted(gpx_dir.glob("*.gpx")):
        result.gpx_count += 1
        try:
            points = parse_gpx(path)
        except (ET.ParseError, OSError, TypeError, ValueError) as error:
            result.findings.append(
                Finding(
                    "未知",
                    path.stem,
                    "GPX 无法解析",
                    "高",
                    str(error),
                    source=path.name,
                )
            )
            continue
        if len(points) < 2:
            continue

        date = next(
            (point[2].date().isoformat() for point in points if point[2] is not None),
            "未知",
        )
        max_jump = 0.0
        max_speed = 0.0
        zero_or_reverse_time = 0
        for left, right in zip(points, points[1:]):
            distance = _distance_m(left[:2], right[:2])
            max_jump = max(max_jump, distance)
            if left[2] is None or right[2] is None:
                continue
            seconds = (right[2] - left[2]).total_seconds()
            if seconds <= 0:
                zero_or_reverse_time += 1
                continue
            max_speed = max(max_speed, distance / seconds)

        details = []
        if max_jump > JUMP_THRESHOLD_METERS:
            details.append(f"最大跳跃约 {max_jump:.0f} 米")
        if max_speed > SPEED_THRESHOLD_MPS:
            details.append(f"最大点间速度约 {max_speed:.1f} 米/秒")
        if zero_or_reverse_time:
            details.append(f"存在 {zero_or_reverse_time} 处重复或倒序时间戳")
        if details:
            result.findings.append(
                Finding(
                    date,
                    path.stem,
                    "GPX 信号/时间异常",
                    "高" if max_jump > JUMP_THRESHOLD_METERS else "中",
                    "；".join(details),
                    source=path.name,
                )
            )


def render_report(result: AuditResult) -> str:
    lines = [
        "# 路线与活动数据异常审计",
        "",
        "> 本报告只记录异常指标，不包含精确坐标，也不会自动修改 GPS 路线。",
        "",
        f"- 数据库活动：{result.activity_count}",
        f"- GPX 文件：{result.gpx_count}",
        f"- 已确认的 Keep/GPX 重复记录：{len(result.duplicate_ids)}",
        f"- 待人工核对的异常项：{len(result.findings)}",
        "",
    ]
    if result.duplicate_ids:
        lines.extend(
            [
                "## 已确认重复记录",
                "",
                "、".join(f"`{run_id}`" for run_id in sorted(result.duplicate_ids)),
                "",
            ]
        )

    lines.extend(
        [
            "## 待人工核对",
            "",
            "| 日期 | 活动 ID | 类型 | 严重度 | 来源 | 指标 | 建议 |",
            "| --- | --- | --- | --- | --- | --- | --- |",
        ]
    )
    for finding in sorted(result.findings):
        values = (
            finding.date,
            finding.run_id,
            finding.category,
            finding.severity,
            finding.source,
            finding.details,
            finding.recommendation,
        )
        lines.append(
            "| " + " | ".join(value.replace("|", "\\|") for value in values) + " |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path(SQL_FILE))
    parser.add_argument("--gpx-dir", type=Path, default=Path(GPX_FOLDER))
    parser.add_argument("--output", type=Path, help="write a Markdown report")
    args = parser.parse_args()

    result = audit_database(args.db)
    audit_gpx(result, args.gpx_dir)
    report = render_report(result)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8")
        print(f"Report written to {args.output}")
    else:
        print(report)
    return 1 if result.duplicate_ids else 0


if __name__ == "__main__":
    raise SystemExit(main())
