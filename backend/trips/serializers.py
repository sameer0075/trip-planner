"""Request validation. Responses are shaped in `presenters.py`."""

from datetime import datetime, timedelta, timezone
from typing import Any, ClassVar
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from trips.hos import DEFAULT_RULES
from trips.services.trip_planner import LocationQuery, TripRequest

MAX_CYCLE_HOURS = DEFAULT_RULES.cycle_limit / 60


class LocationSerializer(serializers.Serializer):
    """Either a place picked from search results (with coordinates) or free text to geocode."""

    label = serializers.CharField(max_length=200, trim_whitespace=True)
    lat = serializers.FloatField(min_value=-90, max_value=90, required=False)
    lng = serializers.FloatField(min_value=-180, max_value=180, required=False)

    def validate(self, attrs: dict[str, Any]) -> LocationQuery:
        if ("lat" in attrs) != ("lng" in attrs):
            raise serializers.ValidationError("Provide both lat and lng, or neither.")
        return LocationQuery(**attrs)


class LocalDateTimeField(serializers.Field):
    """An ISO-8601 datetime. A value without an offset is read in the request's `timezone`."""

    default_error_messages: ClassVar[dict[str, str]] = {
        "invalid": "Enter an ISO-8601 date and time, e.g. 2026-09-25T08:00.",
    }

    def to_internal_value(self, data: Any) -> datetime:
        try:
            return datetime.fromisoformat(str(data))
        except ValueError:
            self.fail("invalid")

    def to_representation(self, value: datetime) -> str:
        return value.isoformat()


class TripPlanRequestSerializer(serializers.Serializer):
    current_location = LocationSerializer()
    pickup_location = LocationSerializer()
    dropoff_location = LocationSerializer()
    current_cycle_used = serializers.FloatField(min_value=0, max_value=MAX_CYCLE_HOURS)
    start_time = LocalDateTimeField(required=False)
    timezone = serializers.CharField(max_length=64, default="UTC")

    def validate_timezone(self, value: str) -> ZoneInfo:
        try:
            return ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise serializers.ValidationError(f'Unknown time zone "{value}".') from exc

    def validate(self, attrs: dict[str, Any]) -> TripRequest:
        zone: ZoneInfo = attrs["timezone"]
        start: datetime = attrs.get("start_time") or datetime.now(zone)
        start = start.astimezone(zone) if start.tzinfo else start.replace(tzinfo=zone)
        return TripRequest(
            current_location=attrs["current_location"],
            pickup_location=attrs["pickup_location"],
            dropoff_location=attrs["dropoff_location"],
            cycle_used_hours=attrs["current_cycle_used"],
            start=_on_fixed_offset(start),
        )


class PlaceSearchSerializer(serializers.Serializer):
    q = serializers.CharField(min_length=2, max_length=200, trim_whitespace=True)
    limit = serializers.IntegerField(min_value=1, max_value=10, default=5)


class CoordinatesSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


def _on_fixed_offset(moment: datetime) -> datetime:
    """Pin the trip to the start's UTC offset, truncated to the minute.

    Logs use one home-terminal time standard for the whole trip, and fixed-offset arithmetic
    keeps every duty period exactly as long as the schedule says across DST transitions.
    """
    offset = moment.utcoffset() or timedelta(0)
    return moment.replace(second=0, microsecond=0, tzinfo=timezone(offset))
