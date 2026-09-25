from collections.abc import Iterator, Sequence
from datetime import datetime, timedelta, timezone
from itertools import pairwise
from typing import Any

import pytest
import responses
from django.core.cache import cache

from trips.services.geometry import METERS_PER_MILE, LatLng, haversine_miles

CENTRAL = timezone(timedelta(hours=-5))


@pytest.fixture
def trip_start() -> datetime:
    return datetime(2026, 9, 25, 8, 0, tzinfo=CENTRAL)


@pytest.fixture(autouse=True)
def _clear_cache() -> Iterator[None]:
    """Geocoding results and throttle history live in the cache; isolate every test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def mocked_http() -> Iterator[responses.RequestsMock]:
    """Fail loudly on any real network access; tests register the responses they expect."""
    with responses.RequestsMock(assert_all_requests_are_fired=False) as mock:
        yield mock


def osrm_route_payload(waypoints: Sequence[LatLng], mph: float = 50.0) -> dict[str, Any]:
    """A minimal OSRM response driving straight lines between waypoints at a constant speed."""
    legs = []
    for start, end in pairwise(waypoints):
        meters = haversine_miles(start, end) * METERS_PER_MILE
        seconds = meters / METERS_PER_MILE / mph * 3600
        legs.append(
            {
                "distance": meters,
                "duration": seconds,
                "steps": [
                    _osrm_step("depart", start, [start, end], meters, seconds, name="I 55"),
                    _osrm_step("arrive", end, [end, end], 0, 0),
                ],
            }
        )
    return {"code": "Ok", "routes": [{"legs": legs}]}


def _osrm_step(
    kind: str,
    location: LatLng,
    points: Sequence[LatLng],
    meters: float,
    seconds: float,
    name: str = "",
) -> dict[str, Any]:
    return {
        "maneuver": {"type": kind, "location": [location[1], location[0]], "bearing_after": 180},
        "name": name,
        "ref": "I 55" if name else "",
        "distance": meters,
        "duration": seconds,
        "geometry": {"coordinates": [[lng, lat] for lat, lng in points]},
    }


def photon_feature(name: str, lat: float, lng: float, **props: str) -> dict[str, Any]:
    return {
        "type": "Feature",
        "properties": {"name": name, "countrycode": "US", **props},
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
    }
