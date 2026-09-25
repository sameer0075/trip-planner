import pytest

from trips.services.instructions import Maneuver, describe, road_name


@pytest.mark.parametrize(
    ("maneuver", "expected"),
    [
        (Maneuver("depart", name="Main Street", bearing_after=270), "Head west on Main Street"),
        (Maneuver("depart", bearing_after=44), "Head northeast"),
        (Maneuver("turn", "left", name="Oak Avenue"), "Turn left onto Oak Avenue"),
        (Maneuver("turn", "uturn", name="Oak Avenue"), "Make a U-turn onto Oak Avenue"),
        (Maneuver("turn", "straight", name="Elm Street"), "Continue onto Elm Street"),
        (Maneuver("new name", "straight", name="Route 66"), "Continue onto Route 66"),
        (Maneuver("continue"), "Continue straight"),
        (Maneuver("on ramp", "right", destinations="I 55 South"), "Take the ramp toward I 55 South"),
        (Maneuver("on ramp", "right", ref="I 55"), "Take the ramp onto I-55"),
        (
            Maneuver("off ramp", "slight right", exits="42A", destinations="Springfield, Joliet"),
            "Take exit 42A toward Springfield",
        ),
        (Maneuver("fork", "slight left", ref="US 66"), "Keep left at the fork onto US 66"),
        (Maneuver("merge", "slight left", ref="I 44"), "Merge onto I-44"),
        (Maneuver("end of road", "right", name="Pine Road"), "Turn right at the end of the road onto Pine Road"),
        (Maneuver("roundabout", roundabout_exit=2, name="Hill Road"), "Enter the roundabout and take the 2nd exit onto Hill Road"),
        (Maneuver("roundabout", roundabout_exit=11), "Enter the roundabout and take the 11th exit"),
        (Maneuver("exit roundabout", name="Hill Road"), "Exit the roundabout onto Hill Road"),
    ],
)  # fmt: skip
def test_describe(maneuver: Maneuver, expected: str) -> None:
    assert describe(maneuver) == expected


def test_arrival_names_the_destination() -> None:
    assert (
        describe(Maneuver("arrive", "right"), "Dallas, TX") == "Arrive at Dallas, TX on the right"
    )
    assert describe(Maneuver("arrive")) == "Arrive at your destination"


@pytest.mark.parametrize(
    ("name", "ref", "expected"),
    [
        ("Stevenson Expressway", "I 55;US 66", "I-55"),
        ("", "US 66", "US 66"),
        ("Main Street", "", "Main Street"),
    ],
)
def test_road_name_prefers_highway_refs(name: str, ref: str, expected: str) -> None:
    assert road_name(name, ref) == expected
