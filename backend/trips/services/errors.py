"""Domain errors raised by the trip services. The API layer maps them onto HTTP responses."""


class TripPlanningError(Exception):
    code = "trip_planning_error"
    default_message = "The trip could not be planned."

    def __init__(self, message: str | None = None) -> None:
        super().__init__(message or self.default_message)
        self.message = message or self.default_message


class LocationNotFoundError(TripPlanningError):
    code = "location_not_found"
    default_message = "The location could not be found."


class RouteNotFoundError(TripPlanningError):
    code = "route_not_found"
    default_message = "No drivable route connects these locations."


class UpstreamServiceError(TripPlanningError):
    code = "upstream_unavailable"
    default_message = "A map service is temporarily unavailable. Please try again shortly."
