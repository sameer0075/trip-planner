"""Orchestrates a trip plan: geocode -> route -> HOS schedule -> daily logs -> named locations."""

import logging
from collections.abc import Iterable, Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime

from django.conf import settings

from trips.hos import Activity, DailyLog, DutyEvent, TripLeg, build_daily_logs, schedule_trip

from .errors import UpstreamServiceError
from .geocoding import Place, geocode, reverse_geocode
from .geometry import LatLng
from .routing import Route, fetch_route

logger = logging.getLogger(__name__)

# Odometer values closer than this are treated as the same spot on the route.
_MILE_PRECISION = 2


@dataclass(frozen=True, slots=True)
class LocationQuery:
    """A user-supplied location: coordinates picked from search results, or free text to geocode."""

    label: str
    lat: float | None = None
    lng: float | None = None


@dataclass(frozen=True, slots=True)
class TripRequest:
    current_location: LocationQuery
    pickup_location: LocationQuery
    dropoff_location: LocationQuery
    cycle_used_hours: float
    start: datetime  # timezone-aware; the logs use this offset as the home-terminal time


@dataclass(frozen=True, slots=True)
class Waypoint:
    name: str  # "City, ST", as written in the remarks of a paper log
    lat: float
    lng: float


@dataclass(frozen=True)
class TripPlan:
    current_location: Place
    pickup_location: Place
    dropoff_location: Place
    cycle_used_hours: float
    route: Route
    events: tuple[DutyEvent, ...]
    logs: tuple[DailyLog, ...]
    waypoints: Mapping[float, Waypoint]

    def location_at(self, mile: float) -> Waypoint:
        return self.waypoints[_mile_key(mile)]


def plan_trip(request: TripRequest) -> TripPlan:
    queries = (request.current_location, request.pickup_location, request.dropoff_location)
    with ThreadPoolExecutor(max_workers=len(queries)) as pool:
        current, pickup, dropoff = pool.map(resolve_location, queries)
    route = fetch_route(
        [(place.lat, place.lng) for place in (current, pickup, dropoff)],
        [place.label for place in (current, pickup, dropoff)],
    )
    to_pickup, to_dropoff = route.legs
    events = schedule_trip(
        [
            TripLeg(to_pickup.distance_miles, to_pickup.duration_hours, Activity.PICKUP),
            TripLeg(to_dropoff.distance_miles, to_dropoff.duration_hours, Activity.DROPOFF),
        ],
        start=request.start,
        cycle_used_hours=request.cycle_used_hours,
    )
    logs = build_daily_logs(events, request.cycle_used_hours)

    anchors = {0.0: current, to_pickup.distance_miles: pickup, route.distance_miles: dropoff}
    return TripPlan(
        current_location=current,
        pickup_location=pickup,
        dropoff_location=dropoff,
        cycle_used_hours=request.cycle_used_hours,
        route=route,
        events=tuple(events),
        logs=tuple(logs),
        waypoints=_locate_miles(route, _referenced_miles(events, logs), anchors),
    )


def resolve_location(query: LocationQuery) -> Place:
    if query.lat is None or query.lng is None:
        return geocode(query.label)
    return Place(name=query.label, context="", lat=query.lat, lng=query.lng)


def _referenced_miles(events: Iterable[DutyEvent], logs: Iterable[DailyLog]) -> set[float]:
    miles = {mile for event in events for mile in (event.start_mile, event.end_mile)}
    miles.update(mile for log in logs for mile in (log.start_mile, log.end_mile))
    return miles


def _locate_miles(
    route: Route, miles: Iterable[float], anchors: Mapping[float, Place]
) -> dict[float, Waypoint]:
    """Place each odometer value on the map and name it, reverse-geocoding concurrently."""
    anchor_by_key = {_mile_key(mile): place for mile, place in anchors.items()}
    points: dict[float, LatLng] = {}
    for mile in miles:
        key = _mile_key(mile)
        anchor = anchor_by_key.get(key)
        points[key] = (anchor.lat, anchor.lng) if anchor else route.point_at_mile(mile)

    with ThreadPoolExecutor(max_workers=settings.REVERSE_GEOCODE_WORKERS) as pool:
        names = dict(zip(points, pool.map(_safe_reverse_geocode, points.values()), strict=True))

    def fallback(key: float, point: LatLng) -> str:
        if anchor := anchor_by_key.get(key):
            return anchor.label
        if road := route.road_at_mile(key):
            return f"{road}, mile {key:.0f}"
        return f"{point[0]:.3f}, {point[1]:.3f}"

    return {
        key: Waypoint(name=names[key] or fallback(key, point), lat=point[0], lng=point[1])
        for key, point in points.items()
    }


def _safe_reverse_geocode(point: LatLng) -> str | None:
    """Place names are cosmetic, so an outage must not fail the whole plan."""
    try:
        return reverse_geocode(*point)
    except UpstreamServiceError:
        logger.warning("Reverse geocoding failed for %s; using a fallback name.", point)
        return None


def _mile_key(mile: float) -> float:
    return round(mile, _MILE_PRECISION)
