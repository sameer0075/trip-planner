"""Renders every API error as `{"error": {"code", "message", "details"?}}`."""

from typing import Any

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

from trips.services.errors import (
    LocationNotFoundError,
    RouteNotFoundError,
    TripPlanningError,
    UpstreamServiceError,
)

_DOMAIN_STATUS: dict[type[TripPlanningError], int] = {
    LocationNotFoundError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    RouteNotFoundError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    UpstreamServiceError: status.HTTP_503_SERVICE_UNAVAILABLE,
}

# Headers DRF sets on error responses that clients rely on (e.g. throttling's Retry-After).
_PRESERVED_HEADERS = {"Retry-After", "Allow", "WWW-Authenticate"}


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(exc, TripPlanningError):
        http_status = _DOMAIN_STATUS.get(type(exc), status.HTTP_400_BAD_REQUEST)
        return _error_response(exc.code, exc.message, http_status)

    if isinstance(exc, Http404):
        exc = NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = PermissionDenied()
    if not isinstance(exc, APIException):
        return None  # Unexpected: let Django log it and produce a 500.

    response = exception_handler(exc, context)
    assert response is not None  # DRF handles every APIException.

    if isinstance(exc, ValidationError):
        return _error_response(
            "invalid_input", "Some fields are invalid.", response.status_code, details=exc.detail
        )
    codes = exc.get_codes()
    error = _error_response(
        codes if isinstance(codes, str) else exc.default_code,
        str(exc.detail),
        response.status_code,
    )
    for header in _PRESERVED_HEADERS & set(response.headers):
        error[header] = response.headers[header]
    return error


def _error_response(code: str, message: str, http_status: int, *, details: Any = None) -> Response:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return Response({"error": body}, status=http_status)
