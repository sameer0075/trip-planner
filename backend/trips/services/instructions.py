"""Turns OSRM maneuvers into human-readable driving instructions.

OSRM returns structured maneuvers (type, modifier, road name/ref, exits) rather than sentences.
See https://project-osrm.org/docs/v5.24.0/api/#stepmaneuver-object for the vocabulary.
"""

from dataclasses import dataclass

_COMPASS = ("north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest")
_ROUNDABOUTS = {"roundabout", "rotary", "roundabout turn"}


@dataclass(frozen=True, slots=True)
class Maneuver:
    type: str
    modifier: str = ""
    name: str = ""
    ref: str = ""
    destinations: str = ""
    exits: str = ""
    bearing_after: int = 0
    roundabout_exit: int | None = None


def road_name(name: str, ref: str) -> str:
    """Prefer the highway designation truckers navigate by, e.g. "I 55;US 66" -> "I-55"."""
    if ref:
        primary = ref.split(";")[0].strip()
        if primary.startswith("I "):
            return primary.replace(" ", "-", 1)
        return primary
    return name


def describe(maneuver: Maneuver, destination: str = "") -> str:
    road = road_name(maneuver.name, maneuver.ref)
    onto = f" onto {road}" if road else ""
    toward = f" toward {_first_destination(maneuver.destinations)}" if maneuver.destinations else ""
    modifier = maneuver.modifier
    kind = maneuver.type

    if kind == "depart":
        heading = _compass(maneuver.bearing_after)
        return f"Head {heading} on {road}" if road else f"Head {heading}"
    if kind == "arrive":
        side = f" on the {modifier}" if modifier in {"left", "right"} else ""
        return f"Arrive at {destination or 'your destination'}{side}"
    if kind in _ROUNDABOUTS:
        nth = maneuver.roundabout_exit
        exit_text = f" and take the {_ordinal(nth)} exit" if nth else ""
        return f"Enter the roundabout{exit_text}{onto}"
    if kind in {"exit roundabout", "exit rotary"}:
        return f"Exit the roundabout{onto}"
    if kind == "on ramp":
        return f"Take the ramp{onto or toward}"
    if kind == "off ramp":
        exit_label = f"exit {maneuver.exits.split(';')[0]}" if maneuver.exits else "the exit"
        return f"Take {exit_label}{toward or onto}"
    if kind == "fork":
        side = modifier.replace("slight ", "") if modifier else "straight"
        return f"Keep {side} at the fork{onto or toward}"
    if kind == "merge":
        return f"Merge{onto or toward}"
    if kind == "end of road":
        return f"Turn {modifier} at the end of the road{onto}"
    if kind == "turn" and modifier == "uturn":
        return f"Make a U-turn{onto}"
    if kind == "turn" and modifier != "straight":
        return f"Turn {modifier}{onto or toward}"
    return f"Continue{onto or toward}" if (onto or toward) else "Continue straight"


def _compass(bearing: int) -> str:
    return _COMPASS[round((bearing % 360) / 45) % 8]


def _first_destination(destinations: str) -> str:
    return destinations.split(",")[0].strip()


def _ordinal(number: int) -> str:
    if 10 <= number % 100 <= 20:
        return f"{number}th"
    suffix = {1: "st", 2: "nd", 3: "rd"}.get(number % 10, "th")
    return f"{number}{suffix}"
