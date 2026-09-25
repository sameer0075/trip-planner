from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class DutyStatus(StrEnum):
    """The four lines of the Record of Duty Status graph grid, in grid order."""

    OFF_DUTY = "off_duty"
    SLEEPER_BERTH = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY = "on_duty"

    @property
    def counts_toward_cycle(self) -> bool:
        return self in (DutyStatus.DRIVING, DutyStatus.ON_DUTY)


class Activity(StrEnum):
    OFF_DUTY = "off_duty"
    PRE_TRIP = "pre_trip"
    DRIVING = "driving"
    PICKUP = "pickup"
    DROPOFF = "dropoff"
    FUEL = "fuel"
    BREAK = "break"
    REST = "rest"
    RESTART = "restart"
    POST_TRIP = "post_trip"

    @property
    def label(self) -> str:
        return ACTIVITY_LABELS[self]


ACTIVITY_LABELS: dict[Activity, str] = {
    Activity.OFF_DUTY: "Off duty",
    Activity.PRE_TRIP: "Pre-trip inspection",
    Activity.DRIVING: "Driving",
    Activity.PICKUP: "Pickup (loading)",
    Activity.DROPOFF: "Drop-off (unloading)",
    Activity.FUEL: "Fuel stop",
    Activity.BREAK: "30-minute break",
    Activity.REST: "10-hour rest",
    Activity.RESTART: "34-hour cycle restart",
    Activity.POST_TRIP: "Post-trip inspection",
}


@dataclass(frozen=True, slots=True)
class TripLeg:
    """A driven segment of the trip, followed by an on-duty stop at its destination."""

    distance_miles: float
    duration_hours: float
    arrival_activity: Activity


@dataclass(frozen=True, slots=True)
class DutyEvent:
    """A continuous period in one duty status. `start_mile`/`end_mile` are route odometer values."""

    status: DutyStatus
    activity: Activity
    start: datetime
    end: datetime
    start_mile: float
    end_mile: float

    @property
    def minutes(self) -> int:
        return int((self.end - self.start).total_seconds() // 60)

    @property
    def miles(self) -> float:
        return self.end_mile - self.start_mile
