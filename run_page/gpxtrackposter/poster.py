"""Create a poster from track data."""

import gettext
import locale
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable, Literal, Protocol, Sequence
from zoneinfo import ZoneInfo

import svgwrite

from .utils import format_float
from .value_range import ValueRange
from .xy import XY
from .year_range import YearRange

DrawerType = Literal["plain", "title", "monthoflife", "year_summary"]


class TracksDrawerProtocol(Protocol):
    def draw(self, dr: svgwrite.Drawing, size: XY, offset: XY) -> None: ...

ZH_TRANSLATIONS = {
    "Runner": "跑者",
    "SPECIAL TRACKS": "特殊里程",
    "STATISTICS": "统计",
    "Number": "次数",
    "Weekly": "周均",
    "Total": "总里程",
    "Avg": "平均",
    "Min": "最短",
    "Max": "最长",
    "MY TRACKS": "我的轨迹",
    "Over": "超过",
    "Stats": "统计",
    "Distance": "总距离",
    "Runs": "跑步次数",
    "Avg Pace": "平均配速",
    "BPM": "心率",
    "Streak": "连跑",
    "Time": "时长",
    "Longest": "最长",
    "Races": "比赛",
    "Full": "全马",
    "Half": "半马",
    "years old": "岁",
    "d": "天",
    "h": "时",
}


class Poster:
    """Create a poster from track data.

    Attributes:
        athlete: Name of athlete to be displayed on poster.
        title: Title of poster.
        tracks_by_date: Tracks organized temporally if needed.
        tracks: List of tracks to be used in the poster.
        length_range: Range of lengths of tracks in poster.
        length_range_by_date: Range of lengths organized temporally.
        units: Length units to be used in poster.
        colors: Colors for various components of the poster.
        width: Poster width.
        height: Poster height.
        years: Years included in the poster.
        tracks_drawer: drawer used to draw the poster.

    Methods:
        set_tracks: Associate the Poster with a set of tracks
        draw: Draw the tracks on the poster.
        m2u: Convert meters to kilometers or miles based on units
        u: Return distance unit (km or mi)
    """

    def __init__(self):
        self.athlete: str | None = None
        self.title: str | None = None
        self.tracks_by_date: dict[str, list[Any]] = {}
        self.tracks: list[Any] = []
        self.length_range: ValueRange | None = None
        self.length_range_by_date: ValueRange | None = None
        self.units = "metric"
        self.colors = {
            "background": "#222222",
            "text": "#FFFFFF",
            "special": "#FFFF00",
            "track": "#4DD2FF",
        }
        self.special_distance = {"special_distance": 10, "special_distance2": 20}
        self.width = 200
        self.height = 300
        self.years: YearRange | None = None
        self.tracks_drawer: TracksDrawerProtocol | None = None
        self.trans: Callable[[str], str] = gettext.NullTranslations().gettext
        self.language = "en"
        self.drawer_type: DrawerType = "title"
        self.set_language(None)
        self.tc_offset = datetime.now(ZoneInfo("Asia/Shanghai")).utcoffset()
        self.github_style = "align-firstday"

    def set_language(self, language: str | None) -> None:
        translation_language = language
        self.language = translation_language or "en"
        if language:
            try:
                locale.setlocale(locale.LC_ALL, f"{language}.utf8")
            except locale.Error as e:
                print(f'Cannot set locale to "{language}": {e}')
                pass

        if translation_language and translation_language.startswith("zh"):
            self.trans = lambda text: ZH_TRANSLATIONS.get(text, text)
            return

        # Fall-back to NullTranslations, if the specified language translation cannot be found.
        if language:
            lang = gettext.translation(
                "gpxposter", localedir="locale", languages=[language], fallback=True
            )
        else:
            lang = gettext.NullTranslations()
        self.trans = lang.gettext

    def set_tracks(self, tracks: Sequence[Any]) -> None:
        """Associate the set of tracks with this poster.

        In addition to setting self.tracks, also compute the necessary attributes for the Poster
        based on this set of tracks.
        """
        self.tracks = list(tracks)
        self.tracks_by_date = {}
        self.length_range = ValueRange()
        self.length_range_by_date = ValueRange()
        years = self.__compute_years(self.tracks)
        for track in self.tracks:
            if not years.contains(track.start_time_local):
                continue
            text_date = track.start_time_local.strftime("%Y-%m-%d")
            if text_date in self.tracks_by_date:
                self.tracks_by_date[text_date].append(track)
            else:
                self.tracks_by_date[text_date] = [track]
            self.length_range.extend(track.length)
        for tracks_for_date in self.tracks_by_date.values():
            length = sum(t.length for t in tracks_for_date)
            self.length_range_by_date.extend(length)

    def draw(self, drawer: TracksDrawerProtocol, output: str) -> None:
        """Set the Poster's drawer and draw the tracks."""
        self.tracks_drawer = drawer
        height = self.height
        width = self.width
        if self.drawer_type == "plain":
            height = height - 100
        if self.drawer_type == "year_summary":
            # Year summary has its own layout, use full size
            height = height
        d = svgwrite.Drawing(output, (f"{width}mm", f"{height}mm"))
        d.viewbox(0, 0, self.width, height)
        d.add(d.rect((0, 0), (width, height), fill=self.colors["background"]))
        if self.drawer_type == "year_summary":
            # Year summary drawer handles its own layout
            self.__draw_tracks(d, XY(width - 10, height - 10), XY(5, 5))
        elif not self.drawer_type == "plain":
            self.__draw_header(d)
            self.__draw_footer(d)
            self.__draw_tracks(d, XY(width - 20, height - 30 - 30), XY(10, 30))
        else:
            self.__draw_tracks(d, XY(width - 20, height), XY(10, 0))
        d.save()

    def m2u(self, m):
        """Convert meters to kilometers or miles, according to units."""
        if self.units == "metric":
            return 0.001 * m
        return 0.001 * m / 1.609344

    def u(self):
        """Return the unit of distance being used on the Poster."""
        if self.units == "metric":
            return "km"
        return "mi"

    def format_distance(self, d: float) -> str:
        """Formats a distance using the locale specific float format and the selected unit."""
        return format_float(self.m2u(d)) + " " + self.u()

    def __draw_tracks(self, d: svgwrite.Drawing, size: XY, offset: XY) -> None:
        if self.tracks_drawer is None:
            raise RuntimeError("No tracks drawer configured")
        self.tracks_drawer.draw(d, size, offset)

    def __draw_header(self, d: svgwrite.Drawing) -> None:
        text_color = self.colors["text"]
        title_style = "font-size:12px; font-family:Arial; font-weight:bold;"
        d.add(
            d.text(self.title or "", insert=(10, 20), fill=text_color, style=title_style)
        )

    def __draw_footer(self, d: svgwrite.Drawing) -> None:
        text_color = self.colors["text"]
        header_style = "font-size:4px; font-family:Arial"
        value_style = "font-size:9px; font-family:Arial"
        small_value_style = "font-size:3px; font-family:Arial"

        special_distance1 = self.special_distance["special_distance"]
        special_distance2 = self.special_distance["special_distance2"]

        (
            total_length,
            average_length,
            min_length,
            max_length,
            weeks,
        ) = self.__compute_track_statistics()

        d.add(
            d.text(
                self.trans("Runner"),
                insert=(10, self.height - 20),
                fill=text_color,
                style=header_style,
            )
        )
        d.add(
            d.text(
                self.athlete or "",
                insert=(10, self.height - 10),
                fill=text_color,
                style=value_style,
            )
        )
        if self.drawer_type != "monthoflife":
            d.add(
                d.text(
                    self.trans("SPECIAL TRACKS"),
                    insert=(65, self.height - 20),
                    fill=text_color,
                    style=header_style,
                )
            )

            d.add(
                d.rect((65, self.height - 17), (2.6, 2.6), fill=self.colors["special"])
            )

            d.add(
                d.text(
                    f"{self.trans('Over')} {special_distance1:.1f} {self.u()}",
                    insert=(70, self.height - 14.5),
                    fill=text_color,
                    style=small_value_style,
                )
            )

            d.add(
                d.rect((65, self.height - 13), (2.6, 2.6), fill=self.colors["special2"])
            )

            d.add(
                d.text(
                    f"{self.trans('Over')} {special_distance2:.1f} {self.u()}",
                    insert=(70, self.height - 10.5),
                    fill=text_color,
                    style=small_value_style,
                )
            )

        d.add(
            d.text(
                self.trans("STATISTICS"),
                insert=(120, self.height - 20),
                fill=text_color,
                style=header_style,
            )
        )
        d.add(
            d.text(
                self.trans("Number") + f": {len(self.tracks)}",
                insert=(120, self.height - 15),
                fill=text_color,
                style=small_value_style,
            )
        )
        d.add(
            d.text(
                self.trans("Weekly") + ": " + format_float(len(self.tracks) / weeks),
                insert=(120, self.height - 10),
                fill=text_color,
                style=small_value_style,
            )
        )
        d.add(
            d.text(
                self.trans("Total") + ": " + self.format_distance(total_length),
                insert=(141, self.height - 15),
                fill=text_color,
                style=small_value_style,
            )
        )
        d.add(
            d.text(
                self.trans("Avg") + ": " + self.format_distance(average_length),
                insert=(141, self.height - 10),
                fill=text_color,
                style=small_value_style,
            )
        )
        d.add(
            d.text(
                self.trans("Min") + ": " + self.format_distance(min_length),
                insert=(167, self.height - 15),
                fill=text_color,
                style=small_value_style,
            )
        )
        d.add(
            d.text(
                self.trans("Max") + ": " + self.format_distance(max_length),
                insert=(167, self.height - 10),
                fill=text_color,
                style=small_value_style,
            )
        )

    def __compute_track_statistics(self):
        length_range = ValueRange()
        total_length = 0
        total_length_year_dict = defaultdict(int)
        weeks = {}
        for t in self.tracks:
            total_length += t.length
            total_length_year_dict[t.start_time_local.year] += t.length
            length_range.extend(t.length)
            # time.isocalendar()[1] -> week number
            weeks[(t.start_time_local.year, t.start_time_local.isocalendar()[1])] = 1
        self.total_length_year_dict = total_length_year_dict
        return (
            total_length,
            total_length / len(self.tracks),
            length_range.lower(),
            length_range.upper(),
            len(weeks),
        )

    def __compute_years(self, tracks: Sequence[Any]) -> YearRange:
        if self.years is not None:
            return self.years
        years = YearRange()
        for t in tracks:
            years.add(t.start_time_local)
        self.years = years
        return years
