"""Splits chronological duty events into midnight-to-midnight Record of Duty Status sheets.

Every sheet covers exactly 24 hours: time before the trip starts and after it ends is off duty.
Locations are kept as route odometer values; resolving them to place names is a presentation
concern handled by the caller.

The recap follows the paper form for 70-hour/8-day drivers. The hours already used when the trip
starts are attributed to the day before the trip, which matches the engine's conservative
assumption that they stay inside the rolling window until a 34-hour restart.
"""

from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from .rules import DEFAULT_RULES, HOSRules
from .types import Activity, DutyEvent, DutyStatus


@dataclass(frozen=True, slots=True)
class LogSegment:
    status: DutyStatus
    activity: Activity
    start_minute: int  # minutes after midnight, 0..1440
    end_minute: int
    start_mile: float
    end_mile: float

    @property
    def minutes(self) -> int:
        return self.end_minute - self.start_minute


@dataclass(frozen=True, slots=True)
class Remark:
    """A change of duty status, which the regulations require to be annotated with a location."""

    minute: int
    status: DutyStatus
    activity: Activity
    mile: float


@dataclass(frozen=True, slots=True)
class Recap:
    """The end-of-day recap block, in minutes."""

    on_duty_today: int  # lines 3 & 4
    on_duty_last_7_days: int  # A: including today
    available_tomorrow: int  # B: cycle limit minus A
    on_duty_last_5_days: int  # C: including today


@dataclass(frozen=True, slots=True)
class DailyLog:
    day: date
    segments: tuple[LogSegment, ...]
    remarks: tuple[Remark, ...]
    recap: Recap

    @property
    def totals_minutes(self) -> dict[DutyStatus, int]:
        totals = dict.fromkeys(DutyStatus, 0)
        for segment in self.segments:
            totals[segment.status] += segment.minutes
        return totals

    @property
    def miles_driven(self) -> float:
        return sum(
            s.end_mile - s.start_mile for s in self.segments if s.status is DutyStatus.DRIVING
        )

    @property
    def start_mile(self) -> float:
        return self.segments[0].start_mile

    @property
    def end_mile(self) -> float:
        return self.segments[-1].end_mile


def build_daily_logs(
    events: Sequence[DutyEvent],
    initial_cycle_hours: float,
    rules: HOSRules = DEFAULT_RULES,
) -> list[DailyLog]:
    if not events:
        return []

    first_day = events[0].start.date()
    # An event ending exactly at midnight does not spill onto the next sheet.
    last_day = (events[-1].end - timedelta(microseconds=1)).date()
    timeline = _pad_with_off_duty(events, first_day, last_day)
    tz = events[0].start.tzinfo

    # On-duty minutes per day that still count toward the cycle, oldest first.
    cycle_history = [round(initial_cycle_hours * 60)]
    logs: list[DailyLog] = []
    for day in _days(first_day, last_day):
        day_start = datetime.combine(day, time.min, tzinfo=tz)
        day_end = day_start + timedelta(days=1)
        segments: list[LogSegment] = []
        remarks: list[Remark] = []
        counted_today = 0

        for event in timeline:
            overlap_start, overlap_end = max(event.start, day_start), min(event.end, day_end)
            if overlap_start >= overlap_end:
                continue
            segment = _clip(event, overlap_start, overlap_end, day_start)
            segments.append(segment)

            if event.status.counts_toward_cycle:
                counted_today += segment.minutes
            if event.activity is Activity.RESTART and event.end <= day_end:
                cycle_history.clear()
                counted_today = 0
            if day_start <= event.start and event is not timeline[0]:
                remarks.append(
                    Remark(segment.start_minute, event.status, event.activity, event.start_mile)
                )

        cycle_history.append(counted_today)
        logs.append(
            DailyLog(
                day=day,
                segments=tuple(segments),
                remarks=tuple(remarks),
                recap=_recap(segments, cycle_history, rules),
            )
        )
    return logs


def _recap(segments: Sequence[LogSegment], cycle_history: Sequence[int], rules: HOSRules) -> Recap:
    last_7_days = sum(cycle_history[-7:])
    return Recap(
        on_duty_today=sum(s.minutes for s in segments if s.status.counts_toward_cycle),
        on_duty_last_7_days=last_7_days,
        available_tomorrow=max(0, rules.cycle_limit - last_7_days),
        on_duty_last_5_days=sum(cycle_history[-5:]),
    )


def _days(first: date, last: date) -> Iterator[date]:
    day = first
    while day <= last:
        yield day
        day += timedelta(days=1)


def _pad_with_off_duty(
    events: Sequence[DutyEvent], first_day: date, last_day: date
) -> list[DutyEvent]:
    """Fill the gap before the first event and after the last one with off-duty time."""
    tz = events[0].start.tzinfo
    first_midnight = datetime.combine(first_day, time.min, tzinfo=tz)
    final_midnight = datetime.combine(last_day + timedelta(days=1), time.min, tzinfo=tz)
    first, last = events[0], events[-1]

    before = DutyEvent(
        DutyStatus.OFF_DUTY, Activity.OFF_DUTY, first_midnight, first.start, 0.0, 0.0
    )
    after = DutyEvent(
        DutyStatus.OFF_DUTY,
        Activity.OFF_DUTY,
        last.end,
        final_midnight,
        last.end_mile,
        last.end_mile,
    )
    # The leading filler is always timeline[0], even when zero-length, so it never gets a remark.
    return [before, *events, after]


def _clip(event: DutyEvent, start: datetime, end: datetime, day_start: datetime) -> LogSegment:
    def mile_at(moment: datetime) -> float:
        if event.minutes == 0:
            return event.start_mile
        fraction = (moment - event.start) / (event.end - event.start)
        return event.start_mile + event.miles * fraction

    return LogSegment(
        status=event.status,
        activity=event.activity,
        start_minute=int((start - day_start).total_seconds() // 60),
        end_minute=int((end - day_start).total_seconds() // 60),
        start_mile=mile_at(start),
        end_mile=mile_at(end),
    )
