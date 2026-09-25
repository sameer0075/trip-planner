"""An independent Hours-of-Service auditor used to verify generated schedules.

It deliberately shares no logic with the engine: it replays the duty events and checks every
driving period against the regulations directly.
"""

from collections.abc import Sequence

from trips.hos import DEFAULT_RULES, Activity, DutyEvent, DutyStatus, HOSRules

_MILE_TOLERANCE = 1e-6


def audit_schedule(
    events: Sequence[DutyEvent], cycle_used_hours: float, rules: HOSRules = DEFAULT_RULES
) -> None:
    """Raise AssertionError on the first HOS or fueling violation in `events`."""
    assert events, "A schedule must contain events."

    cycle = round(cycle_used_hours * 60)
    shift_start = None
    shift_driving = 0
    driving_since_break = 0
    off_streak = 0  # consecutive off-duty or sleeper-berth minutes
    non_driving_streak = 0  # consecutive minutes of anything but driving
    miles_since_fuel = 0.0

    for previous, event in zip([None, *events], events, strict=False):
        assert event.end > event.start, f"Empty or negative event: {event}"
        if previous is not None:
            assert event.start == previous.end, f"Gap or overlap before {event}"
            assert event.start_mile == previous.end_mile, f"Odometer jump before {event}"

        if event.status.counts_toward_cycle:
            off_streak = 0
            cycle += event.minutes
            if shift_start is None:
                shift_start = event.start
        else:
            off_streak += event.minutes
            if off_streak >= rules.daily_rest:
                shift_start, shift_driving, driving_since_break = None, 0, 0
            if off_streak >= rules.cycle_restart:
                cycle = 0

        if event.status is DutyStatus.DRIVING:
            non_driving_streak = 0
            shift_driving += event.minutes
            driving_since_break += event.minutes
            miles_since_fuel += event.miles
            assert shift_start is not None
            window_used = (event.end - shift_start).total_seconds() / 60
            assert shift_driving <= rules.max_driving_per_shift, f"11-hour limit: {event}"
            assert window_used <= rules.duty_window, f"14-hour window: {event}"
            assert driving_since_break <= rules.driving_before_break, f"30-min break: {event}"
            assert cycle <= rules.cycle_limit, f"70-hour limit: {event}"
            assert miles_since_fuel <= rules.fuel_interval_miles + _MILE_TOLERANCE, f"Fuel: {event}"
        else:
            assert event.miles == 0, f"Moved while not driving: {event}"
            non_driving_streak += event.minutes
            if non_driving_streak >= rules.break_duration:
                driving_since_break = 0
            if event.activity is Activity.FUEL:
                miles_since_fuel = 0.0
