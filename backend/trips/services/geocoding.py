"""Forward and reverse geocoding backed by Photon (OpenStreetMap data, free and keyless).

API reference: https://photon.komoot.io
"""

import hashlib
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.core.cache import cache

from .errors import LocationNotFoundError
from .http import get_json
from .regions import abbreviate_region

# Bias searches to North America, where FMCSA hours-of-service rules apply.
_SEARCH_BBOX = "-170,14,-50,72"
# Rural stretches of highway can be far from any named feature.
_REVERSE_RADIUS_KM = 40
_SETTLEMENT_TYPES = {"city", "town", "village", "hamlet"}


@dataclass(frozen=True, slots=True)
class Place:
    name: str
    context: str  # e.g. "Springfield, IL" for a street address
    lat: float
    lng: float

    @property
    def label(self) -> str:
        return f"{self.name}, {self.context}" if self.context else self.name


def search_places(query: str, limit: int = 5) -> list[Place]:
    key = f"geocode:search:{limit}:{hashlib.sha256(query.lower().encode()).hexdigest()}"
    places = cache.get(key)
    if places is None:
        payload = get_json(
            f"{settings.PHOTON_BASE_URL}/api",
            {"q": query, "limit": limit, "lang": "en", "bbox": _SEARCH_BBOX},
        )
        # OSM often has several features for one place (e.g. a city node and its boundary).
        unique: dict[str, Place] = {}
        for place in map(_to_place, payload.get("features", [])):
            unique.setdefault(place.label, place)
        places = list(unique.values())
        cache.set(key, places, settings.GEOCODE_CACHE_SECONDS)
    return places


def geocode(query: str) -> Place:
    places = search_places(query, limit=1)
    if not places:
        raise LocationNotFoundError(f'No location matches "{query}".')
    return places[0]


def reverse_geocode(lat: float, lng: float) -> str | None:
    """A short "City, ST" name for the coordinates, or None when nothing is nearby."""
    key = f"geocode:reverse:{lat:.3f}:{lng:.3f}"
    name = cache.get(key)
    if name is None:
        payload = get_json(
            f"{settings.PHOTON_BASE_URL}/reverse",
            {"lat": lat, "lon": lng, "limit": 1, "lang": "en", "radius": _REVERSE_RADIUS_KM},
        )
        features = payload.get("features", [])
        name = _locality(features[0]["properties"]) if features else ""
        cache.set(key, name, settings.GEOCODE_CACHE_SECONDS)
    return name or None


def _to_place(feature: dict[str, Any]) -> Place:
    props = feature["properties"]
    lng, lat = feature["geometry"]["coordinates"]
    street = " ".join(filter(None, (props.get("housenumber"), props.get("street"))))
    name = props.get("name") or street or props.get("city") or props.get("state") or "Unnamed"

    city = props.get("city") if props.get("city") != name else None
    region = abbreviate_region(props["state"]) if props.get("state") else None
    country = props.get("country") if props.get("countrycode") != "US" else None
    context = ", ".join(part for part in (city, region, country) if part and part != name)
    return Place(name=name, context=context, lat=lat, lng=lng)


def _locality(props: dict[str, Any]) -> str:
    # A settlement's own feature carries its name in `name` rather than `city`.
    settlement = props.get("name") if props.get("type") in _SETTLEMENT_TYPES else None
    town = (
        props.get("city")
        or settlement
        or props.get("district")
        or props.get("county")
        or props.get("name")
    )
    region = abbreviate_region(props["state"]) if props.get("state") else None
    return ", ".join(part for part in (town, region) if part)
