import re
from typing import Any

import pytest
import responses
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from .conftest import osrm_route_payload, photon_feature

OSRM_URL = re.compile(rf"{re.escape(settings.OSRM_BASE_URL)}/route/v1/driving/.*")
PHOTON_SEARCH_URL = f"{settings.PHOTON_BASE_URL}/api"
PHOTON_REVERSE_URL = f"{settings.PHOTON_BASE_URL}/reverse"

CHICAGO = (41.8781, -87.6298)
ST_LOUIS = (38.6270, -90.1994)
DALLAS = (32.7767, -96.7970)


@pytest.fixture
def client() -> APIClient:
    return APIClient()


@pytest.fixture
def map_services(mocked_http: responses.RequestsMock) -> responses.RequestsMock:
    mocked_http.get(OSRM_URL, json=osrm_route_payload([CHICAGO, ST_LOUIS, DALLAS]))
    mocked_http.get(
        PHOTON_REVERSE_URL,
        json={"features": [{"properties": {"type": "city", "name": "Springfield", "state": "MO"}}]},
    )
    return mocked_http


def plan_payload(**overrides: Any) -> dict[str, Any]:
    return {
        "current_location": {"label": "Chicago, IL", "lat": CHICAGO[0], "lng": CHICAGO[1]},
        "pickup_location": {"label": "St. Louis, MO", "lat": ST_LOUIS[0], "lng": ST_LOUIS[1]},
        "dropoff_location": {"label": "Dallas, TX", "lat": DALLAS[0], "lng": DALLAS[1]},
        "current_cycle_used": 20,
        "start_time": "2026-09-25T08:00",
        "timezone": "America/Chicago",
        **overrides,
    }


def post_plan(client: APIClient, payload: dict[str, Any]) -> Any:
    return client.post("/api/trips/plan/", payload, format="json")


def test_health(client: APIClient) -> None:
    assert client.get("/api/health/").json() == {"status": "ok"}


def test_plan_trip(client: APIClient, map_services: responses.RequestsMock) -> None:
    response = post_plan(client, plan_payload())

    assert response.status_code == 200
    body = response.json()
    summary = body["summary"]
    assert summary["start"] == "2026-09-25T08:00:00-05:00"
    assert summary["distance_miles"] == pytest.approx(body["route"]["distance_miles"])
    assert summary["log_days"] == len(body["logs"]) >= 2
    assert summary["cycle_used_start_minutes"] == 20 * 60

    activities = [event["activity"] for event in body["events"]]
    assert activities[0] == "pre_trip"
    assert activities[-1] == "post_trip"
    assert {"pickup", "dropoff", "rest"} <= set(activities)
    assert body["events"][0]["location"]["name"] == "Springfield, MO"

    for log in body["logs"]:
        assert sum(log["totals_minutes"].values()) == 24 * 60
        assert log["segments"][0]["start_minute"] == 0
        assert log["segments"][-1]["end_minute"] == 24 * 60
        assert all(remark["location"] for remark in log["remarks"])

    assert [leg["destination"] for leg in body["route"]["legs"]] == ["St. Louis, MO", "Dallas, TX"]
    assert body["route"]["geometry"][0] == [CHICAGO[0], CHICAGO[1]]


def test_plan_trip_geocodes_free_text_locations(
    client: APIClient, map_services: responses.RequestsMock
) -> None:
    map_services.get(
        PHOTON_SEARCH_URL,
        json={"features": [photon_feature("Chicago", *CHICAGO, state="Illinois")]},
    )

    response = post_plan(client, plan_payload(current_location={"label": "Chicago"}))

    assert response.status_code == 200
    assert response.json()["locations"]["current"] == {
        "label": "Chicago, IL",
        "lat": CHICAGO[0],
        "lng": CHICAGO[1],
    }


def test_plan_trip_keeps_working_when_place_names_are_unavailable(
    client: APIClient, mocked_http: responses.RequestsMock
) -> None:
    mocked_http.get(OSRM_URL, json=osrm_route_payload([CHICAGO, ST_LOUIS, DALLAS]))
    mocked_http.get(PHOTON_REVERSE_URL, status=503)

    response = post_plan(client, plan_payload())

    assert response.status_code == 200
    events = response.json()["events"]
    assert events[0]["location"]["name"] == "Chicago, IL"
    assert events[-1]["location"]["name"] == "Dallas, TX"
    rest = next(event for event in events if event["activity"] == "rest")
    assert re.fullmatch(r"I-55, mile \d+", rest["location"]["name"])


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"current_cycle_used": 71}, "current_cycle_used"),
        ({"current_cycle_used": -1}, "current_cycle_used"),
        ({"timezone": "Mars/Olympus_Mons"}, "timezone"),
        ({"start_time": "yesterday"}, "start_time"),
        ({"pickup_location": {"label": "St. Louis", "lat": 38.6}}, "pickup_location"),
        ({"dropoff_location": {"label": "Dallas", "lat": 95, "lng": 0}}, "dropoff_location"),
        ({"current_location": {"label": ""}}, "current_location"),
    ],
)
def test_plan_trip_rejects_invalid_input(
    client: APIClient, overrides: dict[str, Any], field: str
) -> None:
    response = post_plan(client, plan_payload(**overrides))

    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert field in error["details"]


def test_plan_trip_with_unknown_location(
    client: APIClient, mocked_http: responses.RequestsMock
) -> None:
    mocked_http.get(PHOTON_SEARCH_URL, json={"features": []})

    response = post_plan(client, plan_payload(pickup_location={"label": "Atlantis"}))

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "location_not_found"


def test_plan_trip_without_a_road_connection(
    client: APIClient, mocked_http: responses.RequestsMock
) -> None:
    mocked_http.get(OSRM_URL, status=400, json={"code": "NoRoute"})

    response = post_plan(client, plan_payload())

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "route_not_found"


def test_plan_trip_when_routing_is_down(
    client: APIClient, mocked_http: responses.RequestsMock
) -> None:
    mocked_http.get(OSRM_URL, body=responses.ConnectionError("refused"))

    response = post_plan(client, plan_payload())

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "upstream_unavailable"


def test_place_search(client: APIClient, mocked_http: responses.RequestsMock) -> None:
    mocked_http.get(
        PHOTON_SEARCH_URL,
        json={"features": [photon_feature("Dallas", *DALLAS, state="Texas")]},
    )

    response = client.get("/api/places/search/", {"q": "dal"})

    assert response.json() == {
        "results": [
            {
                "name": "Dallas",
                "context": "TX",
                "label": "Dallas, TX",
                "lat": DALLAS[0],
                "lng": DALLAS[1],
            }
        ]
    }


def test_place_search_requires_a_query(client: APIClient) -> None:
    response = client.get("/api/places/search/", {"q": "d"})

    assert response.status_code == 400
    assert "q" in response.json()["error"]["details"]


def test_reverse_geocode(client: APIClient, map_services: responses.RequestsMock) -> None:
    response = client.get("/api/places/reverse/", {"lat": 37.2, "lng": -93.3})

    assert response.json() == {"label": "Springfield, MO", "lat": 37.2, "lng": -93.3}


def test_unknown_endpoint_uses_the_error_envelope(client: APIClient) -> None:
    response = client.get("/api/nope/")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_throttled_requests_get_retry_after(
    client: APIClient, monkeypatch: pytest.MonkeyPatch, mocked_http: responses.RequestsMock
) -> None:
    mocked_http.get(PHOTON_SEARCH_URL, json={"features": []})
    # DRF reads the rates once at import time, so patch the throttle class itself.
    monkeypatch.setattr(ScopedRateThrottle, "THROTTLE_RATES", {"geocode": "1/min"})

    client.get("/api/places/search/", {"q": "dallas"})
    response = client.get("/api/places/search/", {"q": "dallas"})

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "throttled"
    assert "Retry-After" in response
