"""Driving routes backed by OSRM (OpenStreetMap data, free and keyless).

API reference: https://project-osrm.org/docs/v5.24.0/api/#route-service
"""

from collections.abc import Sequence
from dataclasses import dataclass
from functools import cached_property
from typing import Any

from django.conf import settings

from .errors import RouteNotFoundError, UpstreamServiceError
from .geometry import METERS_PER_MILE, LatLng, Polyline, append_path
from .http import get_json
from .instructions import Maneuver, describe, road_name

_NO_ROUTE_CODES = {"NoRoute", "NoSegment"}


@dataclass(frozen=True, slots=True)
class RouteStep:
    instruction: str
    road: str
    distance_miles: float
    duration_minutes: float


@dataclass(frozen=True)
class RouteLeg:
    distance_miles: float
    duration_hours: float
    geometry: tuple[LatLng, ...]
    steps: tuple[RouteStep, ...]

    @cached_property
    def polyline(self) -> Polyline:
        return Polyline(self.geometry)

    def road_at_fraction(self, fraction: float) -> str:
        """The road being driven `fraction` (0..1) of the way through the leg."""
        target = fraction * self.distance_miles
        travelled = 0.0
        road = ""
        for step in self.steps:
            road = step.road or road
            travelled += step.distance_miles
            if travelled >= target:
                break
        return road


@dataclass(frozen=True)
class Route:
    legs: tuple[RouteLeg, ...]

    @property
    def distance_miles(self) -> float:
        return sum(leg.distance_miles for leg in self.legs)

    @property
    def duration_hours(self) -> float:
        return sum(leg.duration_hours for leg in self.legs)

    @cached_property
    def geometry(self) -> tuple[LatLng, ...]:
        points: list[LatLng] = []
        for leg in self.legs:
            append_path(points, leg.geometry)
        return tuple(points)

    def point_at_mile(self, mile: float) -> LatLng:
        """Locate a route odometer value (as used by the HOS schedule) on the map.

        Each leg's odometer span is mapped onto its own geometry, so stops at leg boundaries
        land exactly on the pickup and drop-off points.
        """
        leg, fraction = self._leg_at_mile(mile)
        return leg.polyline.point_at_fraction(fraction)

    def road_at_mile(self, mile: float) -> str:
        leg, fraction = self._leg_at_mile(mile)
        return leg.road_at_fraction(fraction)

    def _leg_at_mile(self, mile: float) -> tuple[RouteLeg, float]:
        leg_start = 0.0
        for leg in self.legs:
            leg_end = leg_start + leg.distance_miles
            if mile <= leg_end or leg is self.legs[-1]:
                fraction = (mile - leg_start) / leg.distance_miles if leg.distance_miles else 0.0
                return leg, fraction
            leg_start = leg_end
        raise ValueError("A route needs at least one leg.")


def fetch_route(waypoints: Sequence[LatLng], waypoint_names: Sequence[str]) -> Route:
    """Route through `waypoints` in order; `waypoint_names` label the arrival instructions."""
    coordinates = ";".join(f"{lng:.6f},{lat:.6f}" for lat, lng in waypoints)
    payload = get_json(
        f"{settings.OSRM_BASE_URL}/route/v1/driving/{coordinates}",
        {"overview": "false", "steps": "true", "geometries": "geojson"},
        accepted_error_statuses={400},
    )
    code = payload.get("code")
    if code in _NO_ROUTE_CODES or (code == "Ok" and not payload.get("routes")):
        raise RouteNotFoundError
    if code != "Ok":
        raise UpstreamServiceError

    raw_legs = payload["routes"][0]["legs"]
    return Route(
        legs=tuple(
            _parse_leg(raw_leg, destination)
            for raw_leg, destination in zip(raw_legs, waypoint_names[1:], strict=True)
        )
    )


def _parse_leg(raw_leg: dict[str, Any], destination: str) -> RouteLeg:
    geometry: list[LatLng] = []
    steps: list[RouteStep] = []
    for raw_step in raw_leg["steps"]:
        append_path(geometry, [(lat, lng) for lng, lat in raw_step["geometry"]["coordinates"]])
        maneuver = _parse_maneuver(raw_step)
        steps.append(
            RouteStep(
                instruction=describe(maneuver, destination),
                road=road_name(maneuver.name, maneuver.ref),
                distance_miles=raw_step["distance"] / METERS_PER_MILE,
                duration_minutes=raw_step["duration"] / 60,
            )
        )
    return RouteLeg(
        distance_miles=raw_leg["distance"] / METERS_PER_MILE,
        duration_hours=raw_leg["duration"] / 3600,
        geometry=tuple(geometry),
        steps=tuple(steps),
    )


def _parse_maneuver(raw_step: dict[str, Any]) -> Maneuver:
    maneuver = raw_step["maneuver"]
    return Maneuver(
        type=maneuver["type"],
        modifier=maneuver.get("modifier", ""),
        name=raw_step.get("name", ""),
        ref=raw_step.get("ref", ""),
        destinations=raw_step.get("destinations", ""),
        exits=raw_step.get("exits", ""),
        bearing_after=maneuver.get("bearing_after", 0),
        roundabout_exit=maneuver.get("exit"),
    )
