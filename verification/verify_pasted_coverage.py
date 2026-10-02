#!/usr/bin/env python3
"""Compare the pasted Omio route/provider catalog with the generated database."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, order=True)
class Route:
    mode: str | None
    origin: str
    destination: str


CITY_ALIASES = {
    "bareclona": "barcelona",
    "barcelona": "barcelona",
    "boston, ma": "boston",
    "chicago, il": "chicago",
    "frankfurt am main": "frankfurt",
    "genova": "genoa",
    "gibralta": "gibraltar",
    "ibiza (island)": "ibiza",
    "london heathrow airport": "london-heathrow-airport",
    "los angeles, ca": "los-angeles",
    "new york, ny": "new-york",
    "new york city": "new-york",
    "sardinia (island)": "sardinia-island",
    "sevilla": "seville",
    "washington": "washington-dc",
    "washington, dc": "washington-dc",
}


COMPANY_ALIASES = {
    "academy gobuses": "Academy GoBuses",
    "air france": "Air France",
    "alilauro": "Alilauro",
    "alilauro gruson": "Alilauro Gruson",
    "alsa": "Alsa",
    "amtrak": "Amtrak",
    "blablacar bus": "Blablacar Bus",
    "blue star ferries": "Blue Star Ferries",
    "british airways": "British Airways",
    "ceske drahy": "České dráhy",
    "comboios": "Comboios",
    "costa verde": "Costa Verde",
    "deutsche bahn": "Deutsche Bahn",
    "dfds": "DFDS",
    "dfds ferries": "DFDS",
    "easyjet": "easyJet",
    "eurostar": "Eurostar",
    "flixbus": "FlixBus",
    "frecciarossa": "Frecciarossa",
    "gatwick express": "Gatwick Express",
    "greyhound bus": "Greyhound Bus",
    "heathrow express": "Heathrow Express",
    "iberia": "Iberia",
    "infobus": "Infobus",
    "iryo": "iryo",
    "italo": "Italo",
    "klm": "KLM",
    "lufthansa": "Lufthansa",
    "malta air": "Malta Air",
    "national express": "National Express",
    "nlg": "NLG",
    "nlg ferries": "NLG",
    "ns": "NS",
    "obb": "ÖBB",
    "oresundstag": "Öresundståg",
    "ouigo spain": "Ouigo Spain",
    "ourbus": "OurBus",
    "positano jet": "Positano Jet",
    "redcoach": "RedCoach",
    "regiojet": "Regiojet",
    "renfe": "Renfe",
    "ryanair": "Ryanair",
    "sbb": "SBB",
    "seajets": "Seajets",
    "sj": "SJ",
    "snav ferris": "SNAV",
    "sncb": "SNCB",
    "sncf": "SNCF",
    "swiss tours": "Swiss Tours",
    "travelmar": "Travelmar",
    "trenitalia": "Trenitalia",
    "via rail canada": "Via Rail Canada",
    "vr finland": "VR Finland",
    "vueling": "Vueling",
}


FINAL_FERRY_PAIRS = (
    ("Antiparos", "Athens"),
    ("St-Malo", "Dublin"),
    ("Brunnen", "Lucerne"),
    ("Los Cristianos", "Las Palmas"),
    ("Amalfi", "Praiano"),
    ("Naples", "Capri"),
    ("Genova", "Pisa"),
    ("Piraeus", "Hydra"),
    ("Genova", "Civitavecchia"),
    ("Cairnryan", "Belfast"),
)


FINAL_TRAVEL_FERRY_PAIRS = (
    ("Sorrento", "Capri"),
    ("Benidorm", "Ibiza"),
    ("Mykonos", "Paros"),
    ("Chania", "Santorini"),
    ("Naples", "Positano"),
    ("London", "Amsterdam"),
    ("Mykonos", "Santorini"),
    ("Dunkirk", "Dover"),
    ("Kos", "Rhodes"),
    ("Belfast", "Stranraer"),
    ("Rotterdam", "Colchester"),
)


def normalized(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value)
        if unicodedata.category(character) != "Mn"
    ).casefold().strip()


def slug(value: str) -> str:
    clean = value.strip().strip(".")
    key = normalized(clean)
    if key in CITY_ALIASES:
        return CITY_ALIASES[key]
    clean = re.sub(r"\([^)]*\)", "", clean)
    clean = normalized(clean)
    clean = re.sub(r"[^a-z0-9]+", "-", clean).strip("-")
    return clean


def pair(origin: str, destination: str, mode: str | None) -> Route:
    return Route(mode, slug(origin), slug(destination))


def range_between(lines: list[str], start: str, end: str) -> list[str]:
    first = lines.index(start) + 1
    last = lines.index(end, first)
    return lines[first:last]


def parse_to_line(line: str, mode: str | None) -> Route | None:
    cleaned = re.sub(r"^(?:Train|Bus|Flights?|Ferries)\s+(?:from\s+)?", "", line, flags=re.I)
    cleaned = re.sub(r"\s+(?:train|bus|flights?|ferry)$", "", cleaned, flags=re.I)
    cleaned = cleaned.replace(" bus to ", " to ")
    match = re.fullmatch(r"(.+?)\s+to\s+(.+)", cleaned, flags=re.I)
    if not match:
        return None
    return pair(match.group(1), match.group(2), mode)


def parse_dash_line(line: str, mode: str) -> Route | None:
    cleaned = re.sub(r"^(?:Train|Bus|Flights?)\s+", "", line, flags=re.I)
    if " - " not in cleaned:
        return None
    origin, destination = cleaned.split(" - ", 1)
    return pair(origin, destination, mode)


def parse_manifest(source: Path) -> tuple[set[Route], set[str], set[str]]:
    lines = [line.strip() for line in source.read_text(encoding="utf-8").splitlines() if line.strip()]
    routes: set[Route] = set()

    first_block = range_between(
        lines,
        "Popular train, bus, flight and ferry connections",
        "Popular trains, buses, flights and ferries",
    )
    current_mode: str | None = None
    for line in first_block:
        suffix = re.search(r"\b(train|bus|flights?|ferry)$", line, flags=re.I)
        if suffix:
            current_mode = "flight" if suffix.group(1).lower().startswith("flight") else suffix.group(1).lower()
        parsed = parse_to_line(line, current_mode)
        if parsed:
            routes.add(parsed)

    general_popular = range_between(
        lines,
        "Most popular trains, buses and flights",
        "Favourite companies",
    )
    routes.update(route for line in general_popular if (route := parse_to_line(line, None)))

    cross_start = lines.index("Travel to popular destinations by train, bus or flight", lines.index("Travel to popular destinations by train, bus, flight or ferry") + 1)
    cross_end = lines.index("Most popular trains", cross_start)
    routes.update(route for line in lines[cross_start + 1:cross_end] if (route := parse_to_line(line, None)))

    section_specs = (
        ("Most popular trains", "Most popular buses", "train"),
        ("Most popular buses", "Most popular flights", "bus"),
        ("Most popular flights", "Most popular ferries", "flight"),
    )
    for start, end, mode in section_specs:
        routes.update(
            route for line in range_between(lines, start, end) if (route := parse_dash_line(line, mode))
        )

    for line in range_between(lines, "Most popular ferries", "Train Tickets"):
        parsed = parse_to_line(line, "ferry")
        if parsed:
            routes.add(parsed)

    ticket_specs = (
        ("Train Tickets", "Bus Tickets", "train"),
        ("Bus Tickets", "Plane Tickets", "bus"),
        ("Plane Tickets", "Ferries", "flight"),
    )
    for start, end, mode in ticket_specs:
        for line in range_between(lines, start, end):
            if re.match(r"^(?:Trains?|Buses?|Flights?)\s+to\s+", line, flags=re.I):
                continue
            parsed = parse_to_line(line, mode)
            if parsed:
                routes.add(parsed)
        if mode == "bus":
            routes.add(pair("Madrid", "Barcelona", "bus"))

    routes.update(pair(origin, destination, "ferry") for origin, destination in FINAL_FERRY_PAIRS)

    travel_start = lines.index("Travel", lines.index("Ferries"))
    for line in lines[travel_start + 1:]:
        if re.match(r"^(?:Travel|Trains?|Offers|Airport|Essential|Omio|Journey|Japan)\b", line, flags=re.I):
            continue
        if line.lower().endswith(" ferry"):
            parsed = parse_to_line(line, "ferry")
        else:
            parsed = parse_to_line(line, None)
        if parsed:
            routes.add(parsed)
    routes.update(pair(origin, destination, "ferry") for origin, destination in FINAL_TRAVEL_FERRY_PAIRS)

    companies = {
        canonical
        for line in lines
        if (canonical := COMPANY_ALIASES.get(normalized(line))) is not None
    }
    locations = {route.origin for route in routes} | {route.destination for route in routes}
    return routes, companies, locations


def check_database(database: Path, routes: set[Route], companies: set[str], locations: set[str]) -> dict[str, object]:
    connection = sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    database_routes = {
        Route(row["mode"], row["origin"], row["destination"])
        for row in connection.execute(
            """
            SELECT r.mode, origin.slug AS origin, destination.slug AS destination
            FROM routes r
            JOIN locations origin ON origin.id = r.origin_location_id
            JOIN locations destination ON destination.id = r.destination_location_id
            """
        )
    }
    database_pairs = {(route.origin, route.destination) for route in database_routes}
    database_companies = {row[0] for row in connection.execute("SELECT name FROM companies")}
    database_locations = {row[0] for row in connection.execute("SELECT slug FROM locations")}
    connection.close()

    missing_routes = sorted(
        route
        for route in routes
        if (
            (route.origin, route.destination) not in database_pairs
            if route.mode is None
            else route not in database_routes
        )
    )
    missing_companies = sorted(companies - database_companies)
    missing_locations = sorted(locations - database_locations)
    return {
        "manifest": {
            "routes": len(routes),
            "mode_specific_routes": sum(route.mode is not None for route in routes),
            "generic_routes": sum(route.mode is None for route in routes),
            "companies": len(companies),
            "locations": len(locations),
        },
        "database": {
            "routes": len(database_routes),
            "companies": len(database_companies),
            "locations": len(database_locations),
        },
        "missing_routes": [route.__dict__ for route in missing_routes],
        "missing_companies": missing_companies,
        "missing_locations": missing_locations,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--database", type=Path, default=Path("data/omio.sqlite3"))
    arguments = parser.parse_args()
    routes, companies, locations = parse_manifest(arguments.source)
    report = check_database(arguments.database, routes, companies, locations)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if report["missing_routes"] or report["missing_companies"] or report["missing_locations"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
