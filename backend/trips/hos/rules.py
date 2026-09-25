"""FMCSA Hours-of-Service limits for a property-carrying driver on the 70-hour/8-day cycle.

All durations are whole minutes so schedules stay exact on a minute-resolution ELD grid.
Source: FMCSA "Interstate Truck Driver's Guide to Hours of Service" (April 2022), 49 CFR 395.
"""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class HOSRules:
    # 11-hour driving limit within a shift (395.3(a)(3)).
    max_driving_per_shift: int = 11 * 60
    # 14-hour on-duty window that starts when the shift starts (395.3(a)(2)).
    duty_window: int = 14 * 60
    # A 30-minute interruption is required after 8 cumulative hours of driving (395.3(a)(3)(ii)).
    driving_before_break: int = 8 * 60
    break_duration: int = 30
    # 10 consecutive hours off duty resets the 11/14-hour limits (395.3(a)(1)).
    daily_rest: int = 10 * 60
    # 70 hours on duty in any 8 consecutive days (395.3(b)(2)).
    cycle_limit: int = 70 * 60
    # 34 consecutive hours off duty restarts the 70-hour cycle (395.3(c)).
    cycle_restart: int = 34 * 60

    # Operational assumptions from the assessment brief.
    fuel_interval_miles: float = 1000.0
    fuel_duration: int = 30
    pickup_duration: int = 60
    dropoff_duration: int = 60
    # Vehicle inspections, recorded as on-duty (not driving) time.
    pre_trip_inspection: int = 15
    post_trip_inspection: int = 15


DEFAULT_RULES = HOSRules()
