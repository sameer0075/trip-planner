from django.http import HttpRequest, JsonResponse
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from trips.presenters import present_place, present_trip
from trips.serializers import (
    CoordinatesSerializer,
    PlaceSearchSerializer,
    TripPlanRequestSerializer,
)
from trips.services.geocoding import reverse_geocode, search_places
from trips.services.trip_planner import plan_trip


class HealthView(APIView):
    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class TripPlanView(APIView):
    """Plan an HOS-compliant trip: route, duty schedule and daily log sheets."""

    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "trip_plan"

    def post(self, request: Request) -> Response:
        serializer = TripPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(present_trip(plan_trip(serializer.validated_data)))


class PlaceSearchView(APIView):
    """Location autocomplete."""

    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "geocode"

    def get(self, request: Request) -> Response:
        serializer = PlaceSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        places = search_places(serializer.validated_data["q"], serializer.validated_data["limit"])
        return Response({"results": [present_place(place) for place in places]})


class ReverseGeocodeView(APIView):
    """Names the browser's current position for the "use my location" shortcut."""

    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "geocode"

    def get(self, request: Request) -> Response:
        serializer = CoordinatesSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        lat, lng = serializer.validated_data["lat"], serializer.validated_data["lng"]
        name = reverse_geocode(lat, lng) or f"{lat:.4f}, {lng:.4f}"
        return Response({"label": name, "lat": lat, "lng": lng})


def not_found(request: HttpRequest, exception: Exception) -> JsonResponse:
    """JSON 404 for URLs that match no route, consistent with the API error envelope."""
    return JsonResponse(
        {"error": {"code": "not_found", "message": "This endpoint does not exist."}}, status=404
    )


def server_error(request: HttpRequest) -> JsonResponse:
    return JsonResponse(
        {"error": {"code": "server_error", "message": "Something went wrong on our side."}},
        status=500,
    )
