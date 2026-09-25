"""Shapes domain objects into the JSON documents returned by the API.

Durations are reported in minutes (integers, exact on the log grid) and distances in miles.
"""

from dataclasses import asdict
from typing import Any

from trips.hos import Activity, DailyLog, DutyEvent, DutyStatus
from trips.services.geocoding import Place
from trips.services.geometry import simplify
from trips.services.routing import RouteLeg
from trips.services.trip_planner import TripPlan, Waypoint

type JSON = dict[str, Any]

# ~50 m: visually lossless on a web map while shrinking cross-country routes by ~90%.
_MAP_TOLERANCE_DEGREES = 0.0005


def present_trip(plan: TripPlan) -> JSON:
    return {
        "summary": _summary(plan),
        "locations": {
            "current": _place(plan.current_location),
            "pickup": _place(plan.pickup_location),
            "dropoff": _place(plan.dropoff_location),
        },
        "route": {
            "distance_miles": _miles(plan.route.distance_miles),
            "duration_minutes": round(plan.route.duration_hours * 60),
            "geometry": [
                [round(lat, 5), round(lng, 5)]
                for lat, lng in simplify(plan.route.geometry, _MAP_TOLERANCE_DEGREES)
            ],
            "legs": [
                _leg(leg, origin, destination)
                for leg, origin, destination in zip(
                    plan.route.legs,
                    (plan.current_location, plan.pickup_location),
                    (plan.pickup_location, plan.dropoff_location),
                    strict=True,
                )
            ],
        },
        "events": [_event(event, plan) for event in plan.events],
        "logs": [_log(log, plan) for log in plan.logs],
    }


def present_place(place: Place) -> JSON:
    return {"name": place.name, "context": place.context, **_place(place)}


def _summary(plan: TripPlan) -> JSON:
    minutes = dict.fromkeys(DutyStatus, 0)
    for event in plan.events:
        minutes[event.status] += event.minutes
    stop_counts = {
        activity: sum(1 for event in plan.events if event.activity is activity)
        for activity in (Activity.FUEL, Activity.BREAK, Activity.REST, Activity.RESTART)
    }
    start, end = plan.events[0].start, plan.events[-1].end
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "total_minutes": int((end - start).total_seconds() // 60),
        "distance_miles": _miles(plan.route.distance_miles),
        "driving_minutes": minutes[DutyStatus.DRIVING],
        "on_duty_minutes": minutes[DutyStatus.DRIVING] + minutes[DutyStatus.ON_DUTY],
        "off_duty_minutes": minutes[DutyStatus.OFF_DUTY] + minutes[DutyStatus.SLEEPER_BERTH],
        "fuel_stops": stop_counts[Activity.FUEL],
        "breaks": stop_counts[Activity.BREAK],
        "rests": stop_counts[Activity.REST],
        "restarts": stop_counts[Activity.RESTART],
        "log_days": len(plan.logs),
        "cycle_used_start_minutes": round(plan.cycle_used_hours * 60),
        "cycle_available_end_minutes": plan.logs[-1].recap.available_tomorrow,
    }


def _leg(leg: RouteLeg, origin: Place, destination: Place) -> JSON:
    return {
        "origin": origin.label,
        "destination": destination.label,
        "distance_miles": _miles(leg.distance_miles),
        "duration_minutes": round(leg.duration_hours * 60),
        "steps": [
            {
                "instruction": step.instruction,
                "distance_miles": _miles(step.distance_miles),
                "duration_minutes": round(step.duration_minutes, 1),
            }
            for step in leg.steps
        ],
    }


def _event(event: DutyEvent, plan: TripPlan) -> JSON:
    return {
        "status": event.status,
        "activity": event.activity,
        "label": event.activity.label,
        "start": event.start.isoformat(),
        "end": event.end.isoformat(),
        "duration_minutes": event.minutes,
        "start_mile": _miles(event.start_mile),
        "end_mile": _miles(event.end_mile),
        "location": _waypoint(plan.location_at(event.start_mile)),
    }


def _log(log: DailyLog, plan: TripPlan) -> JSON:
    totals = log.totals_minutes
    return {
        "date": log.day.isoformat(),
        "from": plan.location_at(log.start_mile).name,
        "to": plan.location_at(log.end_mile).name,
        "miles_driven": _miles(log.miles_driven),
        "segments": [
            {
                "status": segment.status,
                "activity": segment.activity,
                "start_minute": segment.start_minute,
                "end_minute": segment.end_minute,
            }
            for segment in log.segments
        ],
        "remarks": [
            {
                "minute": remark.minute,
                "status": remark.status,
                "activity": remark.activity,
                "label": remark.activity.label,
                "location": plan.location_at(remark.mile).name,
            }
            for remark in log.remarks
        ],
        "totals_minutes": {status: totals[status] for status in DutyStatus},
        "recap": asdict(log.recap),
    }


def _place(place: Place) -> JSON:
    return {"label": place.label, "lat": place.lat, "lng": place.lng}


def _waypoint(waypoint: Waypoint) -> JSON:
    return {"name": waypoint.name, "lat": round(waypoint.lat, 5), "lng": round(waypoint.lng, 5)}


def _miles(value: float) -> float:
    return round(value, 1)
