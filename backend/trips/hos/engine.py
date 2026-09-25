"""Simulates a trip minute-by-minute against the HOS limits and emits the resulting duty events.

The simulation is greedy, which mirrors how a driver actually runs a trip: keep driving until a
limit forces a stop, then take the shortest stop that makes driving legal again:

* 70-hour cycle exhausted     -> 34-hour restart (off duty)
* 11-hour / 14-hour exhausted -> 10-hour rest (sleeper berth)
* 8 hours driven w/o a break  -> 30-minute break (off duty)

Any 30+ consecutive minutes of non-driving time (fuel, pickup, drop-off) also satisfies the break
requirement, as permitted since the 2020 HOS revision.

The 11/14-hour and 70-hour limits restrict *driving* (395.3(a)-(b)); on-duty work such as unloading
or a post-trip inspection remains legal once they are reached, so only driving forces a stop.

Assumption: the rolling 70-hour/8-day total never "rolls off" during the trip. The brief only gives
the hours already used, not their distribution across prior days, so the conservative reading is
that all of them remain in the window until a 34-hour restart.
"""

import math
from collections.abc import Sequence
from datetime import datetime, timedelta

from .rules import DEFAULT_RULES, HOSRules
from .types import Activity, DutyEvent, DutyStatus, TripLeg

# Guards float rounding when converting a mileage budget into whole driving minutes.
_EPSILON = 1e-9


def schedule_trip(
    legs: Sequence[TripLeg],
    start: datetime,
    cycle_used_hours: float,
    rules: HOSRules = DEFAULT_RULES,
) -> list[DutyEvent]:
    """Return the chronological duty events for driving `legs` starting at `start`."""
    if not 0 <= cycle_used_hours * 60 <= rules.cycle_limit:
        raise ValueError(f"cycle_used_hours must be between 0 and {rules.cycle_limit / 60:g}.")

    simulation = _TripSimulation(rules, start, cycle_used=round(cycle_used_hours * 60))
    for leg in legs:
        simulation.drive(leg)
        simulation.work(leg.arrival_activity, simulation.duration_of(leg.arrival_activity))
    simulation.work(Activity.POST_TRIP, rules.post_trip_inspection)
    return simulation.events


class _TripSimulation:
    def __init__(self, rules: HOSRules, start: datetime, cycle_used: int) -> None:
        self._rules = rules
        self._start = start
        self._clock = 0  # minutes since `start`
        self._odometer = 0.0
        self._cycle_used = cycle_used
        self._shift_start: int | None = None
        self._shift_driving = 0
        self._driving_since_break = 0
        self._non_driving_streak = 0
        self._miles_since_fuel = 0.0
        self.events: list[DutyEvent] = []

    def duration_of(self, activity: Activity) -> int:
        durations = {
            Activity.PICKUP: self._rules.pickup_duration,
            Activity.DROPOFF: self._rules.dropoff_duration,
        }
        return durations[activity]

    # ----------------------------------------------------------------- driving

    def drive(self, leg: TripLeg) -> None:
        if leg.distance_miles <= 0:
            return

        total_minutes = max(1, round(leg.duration_hours * 60))
        miles_per_minute = leg.distance_miles / total_minutes
        leg_start_mile = self._odometer
        driven = 0

        while driven < total_minutes:
            fuel_budget = self._rules.fuel_interval_miles - self._miles_since_fuel
            minutes_to_fuel = math.floor(fuel_budget / miles_per_minute + _EPSILON)
            if minutes_to_fuel <= 0:
                self.work(Activity.FUEL, self._rules.fuel_duration)
                self._miles_since_fuel = 0.0
                continue

            if self._shift_start is None and self._cycle_left() <= self._rules.pre_trip_inspection:
                # Starting a shift would leave no cycle time to drive, so restart first.
                self._take_cycle_restart()
            self._ensure_shift_started()
            available = self._driving_minutes_available()
            if available <= 0:
                self._take_required_stop()
                continue

            chunk = min(available, total_minutes - driven, minutes_to_fuel)
            driven += chunk
            # Derive the odometer from the leg fraction so it lands exactly on the leg distance.
            end_mile = leg_start_mile + leg.distance_miles * driven / total_minutes
            self._miles_since_fuel += end_mile - self._odometer
            self._record(DutyStatus.DRIVING, Activity.DRIVING, chunk, end_mile=end_mile)
            self._shift_driving += chunk
            self._driving_since_break += chunk
            self._cycle_used += chunk
            self._non_driving_streak = 0

    def _driving_minutes_available(self) -> int:
        assert self._shift_start is not None
        rules = self._rules
        return min(
            rules.max_driving_per_shift - self._shift_driving,
            rules.duty_window - (self._clock - self._shift_start),
            rules.driving_before_break - self._driving_since_break,
            self._cycle_left(),
        )

    def _cycle_left(self) -> int:
        return self._rules.cycle_limit - self._cycle_used

    def _take_required_stop(self) -> None:
        assert self._shift_start is not None
        rules = self._rules
        if self._cycle_left() <= 0:
            self._take_cycle_restart()
            return

        window_left_after_break = (
            rules.duty_window - (self._clock - self._shift_start) - rules.break_duration
        )
        driving_left = rules.max_driving_per_shift - self._shift_driving
        if min(driving_left, window_left_after_break) <= 0:
            # A break would not make driving legal again, so the shift is over.
            self._take_daily_rest()
        else:
            self._take_break()

    # ------------------------------------------------------- on-duty & off-duty

    def work(self, activity: Activity, minutes: int) -> None:
        """Record on-duty (not driving) work such as loading, fueling or inspections."""
        self._ensure_shift_started()
        self._on_duty(activity, minutes)

    def _ensure_shift_started(self) -> None:
        """Every shift opens with a pre-trip inspection, which also starts the 14-hour window."""
        if self._shift_start is None:
            self._shift_start = self._clock
            self._on_duty(Activity.PRE_TRIP, self._rules.pre_trip_inspection)

    def _on_duty(self, activity: Activity, minutes: int) -> None:
        self._record(DutyStatus.ON_DUTY, activity, minutes)
        self._cycle_used += minutes
        self._accumulate_non_driving(minutes)

    def _take_break(self) -> None:
        self._record(DutyStatus.OFF_DUTY, Activity.BREAK, self._rules.break_duration)
        self._accumulate_non_driving(self._rules.break_duration)

    def _take_daily_rest(self) -> None:
        self._record(DutyStatus.SLEEPER_BERTH, Activity.REST, self._rules.daily_rest)
        self._end_shift()

    def _take_cycle_restart(self) -> None:
        self._record(DutyStatus.OFF_DUTY, Activity.RESTART, self._rules.cycle_restart)
        self._end_shift()
        self._cycle_used = 0

    def _end_shift(self) -> None:
        self._shift_start = None
        self._shift_driving = 0
        self._driving_since_break = 0
        self._non_driving_streak = 0

    def _accumulate_non_driving(self, minutes: int) -> None:
        self._non_driving_streak += minutes
        if self._non_driving_streak >= self._rules.break_duration:
            self._driving_since_break = 0

    # -------------------------------------------------------------- recording

    def _record(
        self,
        status: DutyStatus,
        activity: Activity,
        minutes: int,
        end_mile: float | None = None,
    ) -> None:
        start_clock, self._clock = self._clock, self._clock + minutes
        start_mile = self._odometer
        if end_mile is not None:
            self._odometer = end_mile
        end = self._start + timedelta(minutes=self._clock)

        previous = self.events[-1] if self.events else None
        if previous and previous.activity == activity and previous.status == status:
            # Keep contiguous chunks of the same activity as one event on the log.
            self.events[-1] = DutyEvent(
                status, activity, previous.start, end, previous.start_mile, self._odometer
            )
            return

        self.events.append(
            DutyEvent(
                status=status,
                activity=activity,
                start=self._start + timedelta(minutes=start_clock),
                end=end,
                start_mile=start_mile,
                end_mile=self._odometer,
            )
        )
