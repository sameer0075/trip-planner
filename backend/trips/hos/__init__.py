"""Pure, framework-free Hours-of-Service domain logic."""

from .daily_log import DailyLog, LogSegment, Recap, Remark, build_daily_logs
from .engine import schedule_trip
from .rules import DEFAULT_RULES, HOSRules
from .types import Activity, DutyEvent, DutyStatus, TripLeg

__all__ = [
    "DEFAULT_RULES",
    "Activity",
    "DailyLog",
    "DutyEvent",
    "DutyStatus",
    "HOSRules",
    "LogSegment",
    "Recap",
    "Remark",
    "TripLeg",
    "build_daily_logs",
    "schedule_trip",
]
