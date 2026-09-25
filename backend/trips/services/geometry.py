"""Polyline helpers: distance along a route and simplification for display."""

import math
from bisect import bisect_left
from collections.abc import Sequence
from itertools import pairwise

type LatLng = tuple[float, float]

EARTH_RADIUS_MILES = 3958.7613
METERS_PER_MILE = 1609.344


def haversine_miles(a: LatLng, b: LatLng) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MILES * math.asin(math.sqrt(h))


class Polyline:
    """An ordered list of points with their cumulative length, for locating points along it."""

    def __init__(self, points: Sequence[LatLng]) -> None:
        if not points:
            raise ValueError("A polyline needs at least one point.")
        self.points = tuple(points)
        cumulative = [0.0]
        for previous, current in pairwise(self.points):
            cumulative.append(cumulative[-1] + haversine_miles(previous, current))
        self._cumulative = cumulative

    @property
    def length_miles(self) -> float:
        return self._cumulative[-1]

    def point_at_fraction(self, fraction: float) -> LatLng:
        """The point `fraction` (0..1) of the way along the line, linearly interpolated."""
        target = min(max(fraction, 0.0), 1.0) * self.length_miles
        index = bisect_left(self._cumulative, target)
        if index == 0:
            return self.points[0]
        if index >= len(self.points):
            return self.points[-1]

        start, end = self._cumulative[index - 1], self._cumulative[index]
        ratio = 0.0 if end == start else (target - start) / (end - start)
        (lat1, lng1), (lat2, lng2) = self.points[index - 1], self.points[index]
        return (lat1 + (lat2 - lat1) * ratio, lng1 + (lng2 - lng1) * ratio)


def append_path(path: list[LatLng], points: Sequence[LatLng]) -> None:
    """Extend `path` with `points`, dropping consecutive duplicates.

    Route steps share their joining point, and arrival steps are a single repeated point.
    """
    for point in points:
        if not path or path[-1] != point:
            path.append(point)


def simplify(points: Sequence[LatLng], tolerance: float) -> list[LatLng]:
    """Ramer-Douglas-Peucker simplification (iterative). `tolerance` is in degrees."""
    if len(points) < 3:
        return list(points)

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        farthest, max_distance = -1, tolerance
        for index in range(first + 1, last):
            distance = _perpendicular_distance(points[index], points[first], points[last])
            if distance > max_distance:
                farthest, max_distance = index, distance
        if farthest != -1:
            keep[farthest] = True
            stack.extend(((first, farthest), (farthest, last)))
    return [point for point, kept in zip(points, keep, strict=True) if kept]


def _perpendicular_distance(point: LatLng, start: LatLng, end: LatLng) -> float:
    (y, x), (y1, x1), (y2, x2) = point, start, end
    dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0:
        return math.hypot(x - x1, y - y1)
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)
