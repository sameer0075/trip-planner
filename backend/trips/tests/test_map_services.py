import re

import pytest
import responses
from django.conf import settings

from trips.services.errors import LocationNotFoundError, RouteNotFoundError, UpstreamServiceError
from trips.services.geocoding import geocode, reverse_geocode, search_places
from trips.services.routing import fetch_route

from .conftest import osrm_route_payload, photon_feature

OSRM_URL = re.compile(rf"{re.escape(settings.OSRM_BASE_URL)}/route/v1/driving/.*")
PHOTON_SEARCH_URL = f"{settings.PHOTON_BASE_URL}/api"
PHOTON_REVERSE_URL = f"{settings.PHOTON_BASE_URL}/reverse"

CHICAGO = (41.8781, -87.6298)
ST_LOUIS = (38.6270, -90.1994)
DALLAS = (32.7767, -96.7970)


# --- routing -----------------------------------------------------------------


def test_fetch_route_parses_legs_steps_and_geometry(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(OSRM_URL, json=osrm_route_payload([CHICAGO, ST_LOUIS, DALLAS]))

    route = fetch_route([CHICAGO, ST_LOUIS, DALLAS], ["Chicago", "St. Louis", "Dallas"])

    first, second = route.legs
    assert first.distance_miles == pytest.approx(262, abs=2)
    assert route.distance_miles == pytest.approx(first.distance_miles + second.distance_miles)
    assert [step.instruction for step in first.steps] == [
        "Head south on I-55",
        "Arrive at St. Louis",
    ]
    assert route.geometry == (CHICAGO, ST_LOUIS, DALLAS)


def test_point_at_mile_lands_on_leg_boundaries(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(OSRM_URL, json=osrm_route_payload([CHICAGO, ST_LOUIS, DALLAS]))
    route = fetch_route([CHICAGO, ST_LOUIS, DALLAS], ["A", "B", "C"])

    assert route.point_at_mile(0) == CHICAGO
    assert route.point_at_mile(route.legs[0].distance_miles) == pytest.approx(ST_LOUIS)
    assert route.point_at_mile(route.distance_miles) == pytest.approx(DALLAS)


def test_fetch_route_without_a_road_connection(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(OSRM_URL, status=400, json={"code": "NoRoute", "message": "Impossible"})

    with pytest.raises(RouteNotFoundError):
        fetch_route([CHICAGO, DALLAS], ["A", "B"])


def test_fetch_route_when_osrm_is_down(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(OSRM_URL, status=502, body="Bad gateway")

    with pytest.raises(UpstreamServiceError):
        fetch_route([CHICAGO, DALLAS], ["A", "B"])


# --- geocoding ---------------------------------------------------------------


def test_search_formats_labels_and_caches(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(
        PHOTON_SEARCH_URL,
        json={
            "features": [
                photon_feature("Chicago", *CHICAGO, state="Illinois"),
                photon_feature("Chicago", 41.9, -87.6, state="Illinois"),
                photon_feature(
                    "", *CHICAGO, housenumber="1", street="Main St", city="Peoria", state="IL"
                ),
                photon_feature(
                    "Toronto", 43.65, -79.38, state="Ontario", country="Canada", countrycode="CA"
                ),
            ]
        },
    )

    places = search_places("chi")
    search_places("CHI")  # served from the cache

    assert [place.label for place in places] == [
        "Chicago, IL",
        "1 Main St, Peoria, IL",
        "Toronto, ON, Canada",
    ]
    assert places[0].lat == CHICAGO[0]
    assert len(mocked_http.calls) == 1


def test_geocode_raises_when_nothing_matches(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(PHOTON_SEARCH_URL, json={"features": []})

    with pytest.raises(LocationNotFoundError, match="Atlantis"):
        geocode("Atlantis")


@pytest.mark.parametrize(
    ("props", "expected"),
    [
        ({"type": "house", "name": "Truck Stop", "city": "Amarillo", "state": "Texas"}, "Amarillo, TX"),
        ({"type": "city", "name": "Chicago", "county": "Cook County", "state": "IL"}, "Chicago, IL"),
        ({"type": "street", "name": "County Road H", "county": "Wheeler", "state": "Texas"}, "Wheeler, TX"),
    ],
)  # fmt: skip
def test_reverse_geocode_names_the_locality(
    mocked_http: responses.RequestsMock, props: dict[str, str], expected: str
) -> None:
    mocked_http.get(PHOTON_REVERSE_URL, json={"features": [{"properties": props}]})

    assert reverse_geocode(35.2, -101.8) == expected


def test_reverse_geocode_in_the_middle_of_nowhere(mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(PHOTON_REVERSE_URL, json={"features": []})

    assert reverse_geocode(36.0, -104.5) is None
    assert reverse_geocode(36.0, -104.5) is None  # the miss is cached too
    assert len(mocked_http.calls) == 1
