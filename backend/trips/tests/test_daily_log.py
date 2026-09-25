from datetime import datetime, timedelta

import pytest

from trips.hos import (
    DEFAULT_RULES,
    Activity,
    DailyLog,
    DutyEvent,
    DutyStatus,
    TripLeg,
    build_daily_logs,
    schedule_trip,
)

MINUTES_PER_DAY = 24 * 60


def event(
    status: DutyStatus,
    activity: Activity,
    start: datetime,
    hours: float,
    start_mile: float = 0.0,
    miles: float = 0.0,
) -> DutyEvent:
    return DutyEvent(
        status, activity, start, start + timedelta(hours=hours), start_mile, start_mile + miles
    )


def assert_covers_whole_day(log: DailyLog) -> None:
    assert log.segments[0].start_minute == 0
    assert log.segments[-1].end_minute == MINUTES_PER_DAY
    for previous, current in zip(log.segments, log.segments[1:], strict=False):
        assert previous.end_minute == current.start_minute
    assert sum(log.totals_minutes.values()) == MINUTES_PER_DAY


def test_single_day_is_padded_with_off_duty(trip_start: datetime) -> None:
    events = [event(DutyStatus.DRIVING, Activity.DRIVING, trip_start, 2, miles=100)]

    (log,) = build_daily_logs(events, initial_cycle_hours=0)

    assert log.day == trip_start.date()
    assert_covers_whole_day(log)
    assert [s.status for s in log.segments] == [
        DutyStatus.OFF_DUTY,
        DutyStatus.DRIVING,
        DutyStatus.OFF_DUTY,
    ]
    assert log.totals_minutes[DutyStatus.DRIVING] == 120
    assert log.miles_driven == pytest.approx(100)


def test_events_crossing_midnight_are_split_proportionally(trip_start: datetime) -> None:
    late = trip_start.replace(hour=22)
    events = [event(DutyStatus.DRIVING, Activity.DRIVING, late, 4, miles=200)]

    first, second = build_daily_logs(events, initial_cycle_hours=0)

    assert first.totals_minutes[DutyStatus.DRIVING] == 120
    assert second.totals_minutes[DutyStatus.DRIVING] == 120
    assert first.miles_driven == pytest.approx(100)
    assert second.start_mile == pytest.approx(100)
    assert second.end_mile == pytest.approx(200)
    assert_covers_whole_day(first)
    assert_covers_whole_day(second)


def test_event_ending_at_midnight_does_not_add_an_empty_sheet(trip_start: datetime) -> None:
    events = [event(DutyStatus.ON_DUTY, Activity.PICKUP, trip_start.replace(hour=23), 1)]

    assert len(build_daily_logs(events, initial_cycle_hours=0)) == 1


def test_remarks_mark_every_change_but_not_the_leading_padding(trip_start: datetime) -> None:
    events = [
        event(DutyStatus.ON_DUTY, Activity.PRE_TRIP, trip_start, 0.25),
        event(DutyStatus.DRIVING, Activity.DRIVING, trip_start + timedelta(minutes=15), 1, 0, 50),
    ]

    (log,) = build_daily_logs(events, initial_cycle_hours=0)

    assert [(r.minute, r.activity) for r in log.remarks] == [
        (8 * 60, Activity.PRE_TRIP),
        (8 * 60 + 15, Activity.DRIVING),
        (9 * 60 + 15, Activity.OFF_DUTY),
    ]
    assert log.remarks[-1].mile == pytest.approx(50)


def test_recap_counts_prior_hours_and_today(trip_start: datetime) -> None:
    events = [event(DutyStatus.DRIVING, Activity.DRIVING, trip_start, 5, miles=250)]

    (log,) = build_daily_logs(events, initial_cycle_hours=30)

    assert log.recap.on_duty_today == 5 * 60
    assert log.recap.on_duty_last_7_days == 35 * 60
    assert log.recap.on_duty_last_5_days == 35 * 60
    assert log.recap.available_tomorrow == DEFAULT_RULES.cycle_limit - 35 * 60


def test_recap_is_reset_by_a_34_hour_restart(trip_start: datetime) -> None:
    restart = event(DutyStatus.OFF_DUTY, Activity.RESTART, trip_start, 34)
    drive = event(DutyStatus.DRIVING, Activity.DRIVING, restart.end, 2, miles=100)

    logs = build_daily_logs([restart, drive], initial_cycle_hours=70)

    assert logs[0].recap.on_duty_last_7_days == 70 * 60
    assert logs[-1].recap.on_duty_last_7_days == 2 * 60
    assert logs[-1].recap.available_tomorrow == 68 * 60


def test_full_trip_logs_are_consistent_with_the_schedule(trip_start: datetime) -> None:
    legs = [
        TripLeg(300, 5.5, Activity.PICKUP),
        TripLeg(1900, 33, Activity.DROPOFF),
    ]
    events = schedule_trip(legs, trip_start, cycle_used_hours=20)

    logs = build_daily_logs(events, initial_cycle_hours=20)

    assert [log.day for log in logs] == [
        trip_start.date() + timedelta(days=offset) for offset in range(len(logs))
    ]
    for log in logs:
        assert_covers_whole_day(log)
    assert sum(log.miles_driven for log in logs) == pytest.approx(2200)
    driving = sum(e.minutes for e in events if e.status is DutyStatus.DRIVING)
    assert sum(log.totals_minutes[DutyStatus.DRIVING] for log in logs) == driving


def test_no_events_means_no_logs() -> None:
    assert build_daily_logs([], initial_cycle_hours=0) == []
