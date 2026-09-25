from datetime import datetime, timedelta
from itertools import pairwise

import pytest

from trips.hos import (
    DEFAULT_RULES,
    Activity,
    DutyEvent,
    DutyStatus,
    HOSRules,
    TripLeg,
    schedule_trip,
)

from .hos_audit import audit_schedule


def legs(to_pickup_hours: float, to_dropoff_hours: float, mph: float = 50.0) -> list[TripLeg]:
    return [
        TripLeg(to_pickup_hours * mph, to_pickup_hours, Activity.PICKUP),
        TripLeg(to_dropoff_hours * mph, to_dropoff_hours, Activity.DROPOFF),
    ]


def activities(events: list[DutyEvent]) -> list[Activity]:
    return [event.activity for event in events]


def driving_minutes(events: list[DutyEvent]) -> int:
    return sum(event.minutes for event in events if event.status is DutyStatus.DRIVING)


def test_short_trip_needs_no_rest(trip_start: datetime) -> None:
    events = schedule_trip(legs(1, 2), trip_start, cycle_used_hours=0)

    assert activities(events) == [
        Activity.PRE_TRIP,
        Activity.DRIVING,
        Activity.PICKUP,
        Activity.DRIVING,
        Activity.DROPOFF,
        Activity.POST_TRIP,
    ]
    assert events[0].start == trip_start
    assert [event.minutes for event in events] == [15, 60, 60, 120, 60, 15]
    assert events[-1].end_mile == pytest.approx(150)


def test_break_is_required_after_eight_hours_of_driving(trip_start: datetime) -> None:
    events = schedule_trip(legs(0, 9), trip_start, cycle_used_hours=0)

    assert activities(events) == [
        Activity.PRE_TRIP,
        Activity.PICKUP,
        Activity.DRIVING,
        Activity.BREAK,
        Activity.DRIVING,
        Activity.DROPOFF,
        Activity.POST_TRIP,
    ]
    first_drive, break_, _ = events[2:5]
    assert first_drive.minutes == DEFAULT_RULES.driving_before_break
    assert break_.status is DutyStatus.OFF_DUTY
    assert break_.minutes == DEFAULT_RULES.break_duration


def test_on_duty_stops_count_as_the_thirty_minute_break(trip_start: datetime) -> None:
    events = schedule_trip(legs(5, 5), trip_start, cycle_used_hours=0)

    assert Activity.BREAK not in activities(events)


def test_daily_rest_after_eleven_hours_of_driving(trip_start: datetime) -> None:
    events = schedule_trip(legs(0, 15), trip_start, cycle_used_hours=0)

    rest = next(event for event in events if event.activity is Activity.REST)
    assert rest.status is DutyStatus.SLEEPER_BERTH
    assert rest.minutes == DEFAULT_RULES.daily_rest
    driving_before_rest = driving_minutes([event for event in events if event.end <= rest.start])
    assert driving_before_rest == DEFAULT_RULES.max_driving_per_shift


def test_fourteen_hour_window_ends_the_shift(trip_start: datetime) -> None:
    # Six hours of driving, then a long pickup; the window closes before 11 hours are driven.
    rules = HOSRules(pickup_duration=7 * 60)
    events = schedule_trip(legs(6, 6), trip_start, cycle_used_hours=0, rules=rules)

    rest = next(event for event in events if event.activity is Activity.REST)
    assert rest.start - trip_start == timedelta(hours=14)
    audit_schedule(events, 0, rules)


def test_exhausted_cycle_starts_with_a_restart(trip_start: datetime) -> None:
    events = schedule_trip(legs(1, 1), trip_start, cycle_used_hours=70)

    assert events[0].activity is Activity.RESTART
    assert events[0].minutes == DEFAULT_RULES.cycle_restart
    audit_schedule(events, 70)


def test_on_duty_work_past_seventy_hours_does_not_force_a_restart(trip_start: datetime) -> None:
    # 69 h used leaves 45 min to drive after the pre-trip inspection; the pickup is still legal.
    events = schedule_trip(legs(0.5, 1), trip_start, cycle_used_hours=69)

    assert activities(events)[:3] == [Activity.PRE_TRIP, Activity.DRIVING, Activity.PICKUP]
    assert activities(events)[3] is Activity.RESTART
    audit_schedule(events, 69)


def test_fuel_stop_at_most_every_thousand_miles(trip_start: datetime) -> None:
    events = schedule_trip(legs(0, 50), trip_start, cycle_used_hours=0)  # 2,500 miles

    fuel_stops = [event for event in events if event.activity is Activity.FUEL]
    assert [stop.start_mile for stop in fuel_stops] == pytest.approx([1000, 2000])
    assert all(stop.minutes == DEFAULT_RULES.fuel_duration for stop in fuel_stops)


def test_contiguous_chunks_of_the_same_activity_are_merged(trip_start: datetime) -> None:
    events = schedule_trip(legs(2, 3), trip_start, cycle_used_hours=0)

    for previous, current in pairwise(events):
        assert (previous.activity, previous.status) != (current.activity, current.status)


def test_rejects_cycle_hours_outside_the_limit(trip_start: datetime) -> None:
    with pytest.raises(ValueError, match="between 0 and 70"):
        schedule_trip(legs(1, 1), trip_start, cycle_used_hours=70.5)


@pytest.mark.parametrize("to_pickup_hours", [0, 0.5, 4, 13])
@pytest.mark.parametrize("to_dropoff_hours", [0.2, 7.9, 8, 11, 26, 60])
@pytest.mark.parametrize("cycle_used_hours", [0, 12.5, 40, 62, 69.75, 70])
def test_every_schedule_is_compliant(
    trip_start: datetime,
    to_pickup_hours: float,
    to_dropoff_hours: float,
    cycle_used_hours: float,
) -> None:
    trip = legs(to_pickup_hours, to_dropoff_hours, mph=57.3)
    events = schedule_trip(trip, trip_start, cycle_used_hours)

    audit_schedule(events, cycle_used_hours)
    assert driving_minutes(events) == sum(
        round(leg.duration_hours * 60) for leg in trip if leg.distance_miles
    )
    assert events[-1].end_mile == pytest.approx(sum(leg.distance_miles for leg in trip))
    assert activities(events).count(Activity.PICKUP) == 1
    assert activities(events).count(Activity.DROPOFF) == 1
    assert events[-1].activity is Activity.POST_TRIP
