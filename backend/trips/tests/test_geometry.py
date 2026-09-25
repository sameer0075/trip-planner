import pytest

from trips.services.geometry import Polyline, append_path, haversine_miles, simplify

CHICAGO = (41.8781, -87.6298)
ST_LOUIS = (38.6270, -90.1994)


def test_haversine_matches_known_distance() -> None:
    assert haversine_miles(CHICAGO, ST_LOUIS) == pytest.approx(262, abs=2)
    assert haversine_miles(CHICAGO, CHICAGO) == 0


def test_polyline_locates_points_by_fraction() -> None:
    line = Polyline([(0.0, 0.0), (0.0, 1.0), (0.0, 3.0)])

    assert line.point_at_fraction(0) == (0.0, 0.0)
    assert line.point_at_fraction(1) == (0.0, 3.0)
    assert line.point_at_fraction(0.5) == pytest.approx((0.0, 1.5), abs=1e-3)
    assert line.point_at_fraction(-1) == (0.0, 0.0)
    assert line.point_at_fraction(2) == (0.0, 3.0)


def test_single_point_polyline() -> None:
    assert Polyline([CHICAGO]).point_at_fraction(0.7) == CHICAGO


def test_polyline_requires_points() -> None:
    with pytest.raises(ValueError, match="at least one point"):
        Polyline([])


def test_simplify_drops_collinear_points_and_keeps_corners() -> None:
    points = [(0.0, 0.0), (0.0, 1.0), (0.0, 2.0), (1.0, 2.0), (2.0, 2.0)]

    assert simplify(points, tolerance=0.01) == [(0.0, 0.0), (0.0, 2.0), (2.0, 2.0)]
    assert simplify(points[:2], tolerance=0.01) == points[:2]


def test_append_path_drops_consecutive_duplicates() -> None:
    path = [(0.0, 0.0), (1.0, 1.0)]

    append_path(path, [(1.0, 1.0), (2.0, 2.0)])
    append_path(path, [(2.0, 2.0), (2.0, 2.0)])
    append_path(path, [(5.0, 5.0)])

    assert path == [(0.0, 0.0), (1.0, 1.0), (2.0, 2.0), (5.0, 5.0)]
