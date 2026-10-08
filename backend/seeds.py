"""Strict-European city and physically coherent itinerary seeds."""

from __future__ import annotations

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt


SOURCE_URL = "https://www.omio.com/"
MODE_PRIORITY = {"flight": 0, "ferry": 1, "train": 2, "bus": 3}
TRANSFER_BUFFER_MINUTES = 45


@dataclass(frozen=True)
class LocationSeed:
    slug: str
    city: str
    country_code: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class RouteLegSeed:
    mode: str
    origin: str
    destination: str
    origin_point: str
    destination_point: str
    duration_minutes: int
    company: str


@dataclass(frozen=True)
class RouteSeed:
    mode: str
    origin: str
    destination: str
    origin_point: str
    destination_point: str
    duration_minutes: int
    base_price_cents: int
    companies: tuple[str, ...]
    source_kind: str = "coverage"
    legs: tuple[RouteLegSeed, ...] = ()


_LOCATION_ROWS = (
    ("tirana", "Tirana", "AL", 41.3275, 19.8187),
    ("durres", "Durres", "AL", 41.3231, 19.4414),
    ("andorra-la-vella", "Andorra la Vella", "AD", 42.5063, 1.5218),
    ("vienna", "Vienna", "AT", 48.2082, 16.3738),
    ("graz", "Graz", "AT", 47.0707, 15.4395),
    ("minsk", "Minsk", "BY", 53.9006, 27.559),
    ("brussels", "Brussels", "BE", 50.8503, 4.3517),
    ("antwerp", "Antwerp", "BE", 51.2194, 4.4025),
    ("bruges", "Bruges", "BE", 51.2093, 3.2247),
    ("sarajevo", "Sarajevo", "BA", 43.8563, 18.4131),
    ("sofia", "Sofia", "BG", 42.6977, 23.3219),
    ("varna", "Varna", "BG", 43.2141, 27.9147),
    ("zagreb", "Zagreb", "HR", 45.815, 15.9819),
    ("split", "Split", "HR", 43.5081, 16.4402),
    ("rijeka", "Rijeka", "HR", 45.3271, 14.4422),
    ("prague", "Prague", "CZ", 50.0755, 14.4378),
    ("brno", "Brno", "CZ", 49.1951, 16.6068),
    ("copenhagen", "Copenhagen", "DK", 55.6761, 12.5683),
    ("aarhus", "Aarhus", "DK", 56.1629, 10.2039),
    ("tallinn", "Tallinn", "EE", 59.437, 24.7536),
    ("helsinki", "Helsinki", "FI", 60.1699, 24.9384),
    ("turku", "Turku", "FI", 60.4518, 22.2666),
    ("tampere", "Tampere", "FI", 61.4978, 23.761),
    ("paris", "Paris", "FR", 48.8566, 2.3522),
    ("marseille", "Marseille", "FR", 43.2965, 5.3698),
    ("lyon", "Lyon", "FR", 45.764, 4.8357),
    ("nice", "Nice", "FR", 43.7102, 7.262),
    ("bordeaux", "Bordeaux", "FR", 44.8378, -0.5792),
    ("toulouse", "Toulouse", "FR", 43.6047, 1.4442),
    ("strasbourg", "Strasbourg", "FR", 48.5734, 7.7521),
    ("berlin", "Berlin", "DE", 52.52, 13.405),
    ("hamburg", "Hamburg", "DE", 53.5511, 9.9937),
    ("munich", "Munich", "DE", 48.1351, 11.582),
    ("frankfurt", "Frankfurt am Main", "DE", 50.1109, 8.6821),
    ("cologne", "Cologne", "DE", 50.9375, 6.9603),
    ("dresden", "Dresden", "DE", 51.0504, 13.7373),
    ("athens", "Athens", "GR", 37.9838, 23.7275),
    ("thessaloniki", "Thessaloniki", "GR", 40.6401, 22.9444),
    ("piraeus", "Piraeus", "GR", 37.942, 23.6465),
    ("patras", "Patras", "GR", 38.2466, 21.7346),
    ("heraklion", "Heraklion", "GR", 35.3387, 25.1442),
    ("budapest", "Budapest", "HU", 47.4979, 19.0402),
    ("reykjavik", "Reykjavik", "IS", 64.1466, -21.9426),
    ("dublin", "Dublin", "IE", 53.3498, -6.2603),
    ("cork", "Cork", "IE", 51.8985, -8.4756),
    ("rome", "Rome", "IT", 41.9028, 12.4964),
    ("milan", "Milan", "IT", 45.4642, 9.19),
    ("naples", "Naples", "IT", 40.8518, 14.2681),
    ("florence", "Florence", "IT", 43.7696, 11.2558),
    ("venice", "Venice", "IT", 45.4408, 12.3155),
    ("genoa", "Genoa", "IT", 44.4056, 8.9463),
    ("bari", "Bari", "IT", 41.1171, 16.8719),
    ("palermo", "Palermo", "IT", 38.1157, 13.3615),
    ("cagliari", "Cagliari", "IT", 39.2238, 9.1217),
    ("bologna", "Bologna", "IT", 44.4949, 11.3426),
    ("turin", "Turin", "IT", 45.0703, 7.6869),
    ("pristina", "Pristina", "XK", 42.6629, 21.1655),
    ("riga", "Riga", "LV", 56.9496, 24.1052),
    ("vaduz", "Vaduz", "LI", 47.141, 9.5209),
    ("vilnius", "Vilnius", "LT", 54.6872, 25.2797),
    ("klaipeda", "Klaipeda", "LT", 55.7033, 21.1443),
    ("luxembourg", "Luxembourg", "LU", 49.6116, 6.1319),
    ("valletta", "Valletta", "MT", 35.8989, 14.5146),
    ("chisinau", "Chisinau", "MD", 47.0105, 28.8638),
    ("monaco", "Monaco", "MC", 43.7384, 7.4246),
    ("podgorica", "Podgorica", "ME", 42.4304, 19.2594),
    ("amsterdam", "Amsterdam", "NL", 52.3676, 4.9041),
    ("rotterdam", "Rotterdam", "NL", 51.9244, 4.4777),
    ("utrecht", "Utrecht", "NL", 52.0907, 5.1214),
    ("skopje", "Skopje", "MK", 41.9973, 21.428),
    ("oslo", "Oslo", "NO", 59.9139, 10.7522),
    ("bergen", "Bergen", "NO", 60.3913, 5.3221),
    ("kristiansand", "Kristiansand", "NO", 58.1467, 7.9956),
    ("warsaw", "Warsaw", "PL", 52.2297, 21.0122),
    ("krakow", "Krakow", "PL", 50.0647, 19.945),
    ("gdansk", "Gdansk", "PL", 54.352, 18.6466),
    ("wroclaw", "Wroclaw", "PL", 51.1079, 17.0385),
    ("poznan", "Poznan", "PL", 52.4064, 16.9252),
    ("lisbon", "Lisbon", "PT", 38.7223, -9.1393),
    ("porto", "Porto", "PT", 41.1579, -8.6291),
    ("bucharest", "Bucharest", "RO", 44.4268, 26.1025),
    ("constanta", "Constanta", "RO", 44.1598, 28.6348),
    ("cluj-napoca", "Cluj-Napoca", "RO", 46.7712, 23.6236),
    ("timisoara", "Timisoara", "RO", 45.7489, 21.2087),
    ("moscow", "Moscow", "RU", 55.7558, 37.6173),
    ("saint-petersburg", "Saint Petersburg", "RU", 59.9311, 30.3609),
    ("san-marino", "San Marino", "SM", 43.9424, 12.4578),
    ("belgrade", "Belgrade", "RS", 44.7866, 20.4489),
    ("novi-sad", "Novi Sad", "RS", 45.2671, 19.8335),
    ("bratislava", "Bratislava", "SK", 48.1486, 17.1077),
    ("ljubljana", "Ljubljana", "SI", 46.0569, 14.5058),
    ("madrid", "Madrid", "ES", 40.4168, -3.7038),
    ("barcelona", "Barcelona", "ES", 41.3874, 2.1686),
    ("valencia", "Valencia", "ES", 39.4699, -0.3763),
    ("seville", "Seville", "ES", 37.3891, -5.9845),
    ("malaga", "Malaga", "ES", 36.7213, -4.4214),
    ("bilbao", "Bilbao", "ES", 43.263, -2.935),
    ("santander", "Santander", "ES", 43.4623, -3.81),
    ("palma", "Palma", "ES", 39.5696, 2.6502),
    ("stockholm", "Stockholm", "SE", 59.3293, 18.0686),
    ("gothenburg", "Gothenburg", "SE", 57.7089, 11.9746),
    ("malmo", "Malmo", "SE", 55.605, 13.0038),
    ("bern", "Bern", "CH", 46.948, 7.4474),
    ("zurich", "Zurich", "CH", 47.3769, 8.5417),
    ("geneva", "Geneva", "CH", 46.2044, 6.1432),
    ("kyiv", "Kyiv", "UA", 50.4501, 30.5234),
    ("lviv", "Lviv", "UA", 49.8397, 24.0297),
    ("odesa", "Odesa", "UA", 46.4825, 30.7233),
    ("london", "London", "GB", 51.5072, -0.1276),
    ("edinburgh", "Edinburgh", "GB", 55.9533, -3.1883),
    ("glasgow", "Glasgow", "GB", 55.8642, -4.2518),
    ("cardiff", "Cardiff", "GB", 51.4816, -3.1791),
    ("manchester", "Manchester", "GB", 53.4808, -2.2426),
    ("birmingham", "Birmingham", "GB", 52.4862, -1.8904),
    ("liverpool", "Liverpool", "GB", 53.4084, -2.9916),
    ("portsmouth", "Portsmouth", "GB", 50.8198, -1.088),
    ("belfast", "Belfast", "GB", 54.5973, -5.9301),
    ("leeds", "Leeds", "GB", 53.8008, -1.5491),
    ("vatican-city", "Vatican City", "VA", 41.9029, 12.4534),
    ("istanbul", "Istanbul", "TR", 41.0082, 28.9784),
)

LOCATIONS = tuple(LocationSeed(*row) for row in _LOCATION_ROWS)
_LOCATION_BY_SLUG = {location.slug: location for location in LOCATIONS}


CAPITAL_SLUGS = frozenset({
    "tirana", "andorra-la-vella", "vienna", "minsk", "brussels", "sarajevo",
    "sofia", "zagreb", "prague", "copenhagen", "tallinn", "helsinki", "paris",
    "berlin", "athens", "budapest", "reykjavik", "dublin", "rome", "pristina",
    "riga", "vaduz", "vilnius", "luxembourg", "valletta", "chisinau", "monaco",
    "podgorica", "amsterdam", "skopje", "oslo", "warsaw", "lisbon", "bucharest",
    "moscow", "san-marino", "belgrade", "bratislava", "ljubljana", "madrid",
    "stockholm", "bern", "kyiv", "london", "vatican-city",
})


AIRPORTLESS_GATEWAYS = {
    "andorra-la-vella": ("barcelona", "Andorra la Vella Bus Station", "Barcelona Nord Bus Station", "Andbus"),
    "vaduz": ("zurich", "Vaduz Post via Sargans/Buchs", "Zurich Bus Station", "LIEmobil"),
    "san-marino": ("bologna", "San Marino Bus Terminal via Rimini", "Bologna Autostazione", "San Marino Shuttle"),
    "vatican-city": ("rome", "Vatican City Bus Stop", "Rome Tiburtina Bus Station", "ATAC"),
    "monaco": ("nice", "Monaco-Monte-Carlo Station", "Nice-Ville Station", "SNCF"),
}


AIRPORT_POINTS = {
    "tirana": "Tirana International Airport", "vienna": "Vienna International Airport",
    "minsk": "Minsk National Airport", "brussels": "Brussels Airport",
    "sarajevo": "Sarajevo International Airport", "sofia": "Sofia Airport",
    "zagreb": "Zagreb Airport", "prague": "Prague Airport",
    "copenhagen": "Copenhagen Airport", "tallinn": "Tallinn Airport",
    "helsinki": "Helsinki Airport", "paris": "Paris Charles de Gaulle Airport",
    "marseille": "Marseille Provence Airport", "lyon": "Lyon-Saint Exupery Airport",
    "nice": "Nice Cote d'Azur Airport", "bordeaux": "Bordeaux Airport",
    "toulouse": "Toulouse-Blagnac Airport", "berlin": "Berlin Brandenburg Airport",
    "hamburg": "Hamburg Airport", "munich": "Munich Airport",
    "frankfurt": "Frankfurt Airport", "athens": "Athens International Airport",
    "thessaloniki": "Thessaloniki Airport", "heraklion": "Heraklion Airport",
    "budapest": "Budapest Airport", "reykjavik": "Keflavik International Airport",
    "dublin": "Dublin Airport", "cork": "Cork Airport",
    "rome": "Rome Fiumicino Airport", "milan": "Milan Malpensa Airport",
    "naples": "Naples International Airport", "venice": "Venice Marco Polo Airport",
    "genoa": "Genoa Airport", "bari": "Bari Airport",
    "palermo": "Palermo Airport", "cagliari": "Cagliari Airport",
    "bologna": "Bologna Airport", "turin": "Turin Airport",
    "pristina": "Pristina International Airport", "riga": "Riga International Airport",
    "vilnius": "Vilnius Airport", "luxembourg": "Luxembourg Airport",
    "valletta": "Malta International Airport", "chisinau": "Chisinau International Airport",
    "podgorica": "Podgorica Airport", "amsterdam": "Amsterdam Schiphol Airport",
    "skopje": "Skopje International Airport", "oslo": "Oslo Airport",
    "bergen": "Bergen Airport", "kristiansand": "Kristiansand Airport",
    "warsaw": "Warsaw Chopin Airport", "krakow": "Krakow Airport",
    "gdansk": "Gdansk Airport", "wroclaw": "Wroclaw Airport",
    "poznan": "Poznan Airport", "lisbon": "Lisbon Airport", "porto": "Porto Airport",
    "bucharest": "Bucharest Henri Coanda Airport", "cluj-napoca": "Cluj International Airport",
    "timisoara": "Timisoara Airport", "moscow": "Moscow Sheremetyevo Airport",
    "saint-petersburg": "Pulkovo Airport", "belgrade": "Belgrade Nikola Tesla Airport",
    "ljubljana": "Ljubljana Airport", "madrid": "Madrid Barajas Airport",
    "barcelona": "Barcelona El Prat Airport", "valencia": "Valencia Airport",
    "seville": "Seville Airport", "malaga": "Malaga Airport", "bilbao": "Bilbao Airport",
    "santander": "Santander Airport", "palma": "Palma de Mallorca Airport",
    "stockholm": "Stockholm Arlanda Airport", "gothenburg": "Gothenburg Landvetter Airport",
    "zurich": "Zurich Airport", "geneva": "Geneva Airport", "kyiv": "Kyiv Boryspil Airport",
    "lviv": "Lviv International Airport", "odesa": "Odesa International Airport",
    "london": "London Heathrow Airport", "edinburgh": "Edinburgh Airport",
    "glasgow": "Glasgow Airport", "cardiff": "Cardiff Airport",
    "manchester": "Manchester Airport", "birmingham": "Birmingham Airport",
    "liverpool": "Liverpool John Lennon Airport", "belfast": "Belfast International Airport",
    "leeds": "Leeds Bradford Airport", "istanbul": "Istanbul Airport (European side)",
}


PORT_POINTS = {
    "helsinki": "Port of Helsinki", "tallinn": "Tallinn Passenger Port",
    "turku": "Port of Turku", "stockholm": "Stockholm Vartahamnen Terminal",
    "copenhagen": "Copenhagen Ferry Terminal", "oslo": "Oslo Ferry Terminal",
    "belfast": "Belfast Ferry Terminal",
    "liverpool": "Birkenhead (Liverpool) Ferry Terminal",
    "portsmouth": "Portsmouth International Port", "santander": "Port of Santander",
    "bilbao": "Port of Bilbao", "barcelona": "Port of Barcelona",
    "palma": "Port of Palma", "valencia": "Port of Valencia", "genoa": "Port of Genoa",
    "naples": "Naples Ferry Terminal", "palermo": "Port of Palermo",
    "cagliari": "Port of Cagliari", "bari": "Port of Bari", "durres": "Port of Durres",
    "patras": "Port of Patras", "venice": "Port of Venice", "split": "Port of Split",
    "piraeus": "Port of Piraeus", "heraklion": "Port of Heraklion",
}


FERRY_CORRIDORS = frozenset({
    frozenset(pair) for pair in (
        ("helsinki", "tallinn"), ("helsinki", "stockholm"), ("turku", "stockholm"),
        ("copenhagen", "oslo"), ("belfast", "liverpool"),
        ("portsmouth", "santander"), ("portsmouth", "bilbao"),
        ("barcelona", "palma"), ("valencia", "palma"), ("barcelona", "genoa"),
        ("naples", "palermo"), ("naples", "cagliari"), ("genoa", "palermo"),
        ("genoa", "cagliari"), ("palermo", "cagliari"), ("bari", "durres"),
        ("bari", "patras"), ("venice", "patras"), ("split", "bari"),
        ("piraeus", "heraklion"),
    )
})


TRAIN_CORRIDORS = frozenset({
    frozenset(pair) for pair in (
        ("london", "paris"), ("london", "brussels"), ("paris", "brussels"),
        ("paris", "amsterdam"), ("brussels", "amsterdam"), ("paris", "strasbourg"),
        ("paris", "lyon"), ("paris", "bordeaux"), ("madrid", "barcelona"),
        ("madrid", "valencia"), ("berlin", "hamburg"), ("berlin", "dresden"),
        ("berlin", "prague"), ("prague", "vienna"), ("vienna", "budapest"),
        ("vienna", "bratislava"), ("vienna", "graz"), ("munich", "vienna"),
        ("frankfurt", "cologne"), ("frankfurt", "brussels"), ("milan", "turin"),
        ("milan", "venice"), ("milan", "bologna"), ("bologna", "florence"),
        ("florence", "rome"), ("rome", "naples"), ("stockholm", "gothenburg"),
        ("copenhagen", "malmo"), ("oslo", "gothenburg"), ("warsaw", "krakow"),
        ("warsaw", "gdansk"), ("warsaw", "poznan"), ("krakow", "wroclaw"),
        ("lisbon", "porto"), ("bucharest", "constanta"), ("belgrade", "novi-sad"),
        ("sofia", "istanbul"), ("moscow", "saint-petersburg"),
        ("kyiv", "lviv"), ("zurich", "bern"), ("zurich", "geneva"),
    )
})

BUS_CORRIDORS = frozenset({
    frozenset(("london", "paris")),
})


ISLAND_REGIONS = {
    "reykjavik": "iceland", "dublin": "ireland", "cork": "ireland",
    "belfast": "ireland", "valletta": "malta", "heraklion": "crete",
    "palermo": "sicily", "cagliari": "sardinia", "palma": "mallorca",
    "london": "great-britain", "edinburgh": "great-britain",
    "glasgow": "great-britain", "cardiff": "great-britain",
    "manchester": "great-britain", "birmingham": "great-britain",
    "liverpool": "great-britain", "portsmouth": "great-britain",
    "leeds": "great-britain",
    "helsinki": "finland", "turku": "finland", "tampere": "finland",
    "oslo": "scandinavia", "bergen": "scandinavia",
    "kristiansand": "scandinavia", "stockholm": "scandinavia",
    "gothenburg": "scandinavia", "malmo": "scandinavia",
}


def distance_km(origin: str, destination: str) -> float:
    first = _LOCATION_BY_SLUG[origin]
    second = _LOCATION_BY_SLUG[destination]
    lat1, lat2 = radians(first.latitude), radians(second.latitude)
    delta_lat = lat2 - lat1
    delta_lon = radians(second.longitude - first.longitude)
    haversine = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    )
    return 6371 * 2 * asin(sqrt(haversine))


def _companies_for(mode: str, origin: str, destination: str) -> tuple[str, ...]:
    countries = {
        _LOCATION_BY_SLUG[origin].country_code,
        _LOCATION_BY_SLUG[destination].country_code,
    }
    if mode == "train":
        if "GB" in countries:
            return ("Eurostar",)
        if "IT" in countries:
            return ("Trenitalia", "Italo")
        if "ES" in countries:
            return ("Renfe",)
        if countries & {"AT", "CH", "DE"}:
            return ("ÖBB", "Deutsche Bahn")
        return ("European Rail Connect",)
    if mode == "bus":
        if "GB" in countries:
            return ("National Express", "FlixBus")
        if "ES" in countries:
            return ("Alsa", "FlixBus")
        return ("FlixBus", "European Coach Lines")
    if mode == "flight":
        return ("Lufthansa", "Ryanair", "easyJet")
    if mode == "ferry":
        if countries & {"SE", "FI", "EE", "DK", "NO"}:
            return ("Baltic Ferry Lines",)
        if countries & {"GB", "IE"}:
            return ("Atlantic Ferry Lines",)
        return ("Mediterranean Ferry Lines",)
    raise ValueError(f"unsupported mode {mode!r}")


def _point(mode: str, slug: str) -> str:
    city = _LOCATION_BY_SLUG[slug].city
    if mode == "flight":
        return AIRPORT_POINTS[slug]
    if mode == "ferry":
        return PORT_POINTS[slug]
    if mode == "train":
        if slug == "istanbul":
            return "Istanbul Halkali Station (European side)"
        return f"{city} Central Station"
    if slug == "istanbul":
        return "Istanbul Esenler Coach Station (European side)"
    return f"{city} Coach Station"


def _leg(
    mode: str,
    origin: str,
    destination: str,
    *,
    company: str | None = None,
) -> RouteLegSeed:
    distance = max(20.0, distance_km(origin, destination))
    duration = {
        "train": round(distance / 130 * 60 + 25),
        "bus": round(distance / 70 * 60 + 30),
        "flight": round(distance / 720 * 60 + 75),
        "ferry": round(distance / 45 * 60 + 30),
    }[mode]
    return RouteLegSeed(
        mode,
        origin,
        destination,
        _point(mode, origin),
        _point(mode, destination),
        max(20, duration),
        company or _companies_for(mode, origin, destination)[0],
    )


def _access_leg(origin: str, destination: str) -> RouteLegSeed:
    microstate = origin if origin in AIRPORTLESS_GATEWAYS else destination
    gateway, micro_point, gateway_point, company = AIRPORTLESS_GATEWAYS[microstate]
    mode = "train" if microstate == "monaco" else "bus"
    duration = max(
        20,
        round(distance_km(microstate, gateway) / 65 * 60 + 25),
    )
    if origin == microstate:
        return RouteLegSeed(
            mode,
            origin,
            gateway,
            micro_point,
            gateway_point,
            duration,
            company,
        )
    return RouteLegSeed(
        mode,
        gateway,
        destination,
        gateway_point,
        micro_point,
        duration,
        company,
    )


def _region(slug: str) -> str:
    return ISLAND_REGIONS.get(slug, "mainland")


def _nearest_airport(slug: str) -> str:
    if slug in AIRPORT_POINTS:
        return slug
    region = _region(slug)
    candidates = [
        candidate
        for candidate in AIRPORT_POINTS
        if _region(candidate) == region
    ]
    return min(candidates, key=lambda candidate: distance_km(slug, candidate))


def _flight_legs(origin: str, destination: str) -> tuple[RouteLegSeed, ...]:
    origin_airport = _nearest_airport(origin)
    destination_airport = _nearest_airport(destination)
    legs: list[RouteLegSeed] = []
    if origin != origin_airport:
        legs.append(_leg("bus", origin, origin_airport))
    flight_path = [origin_airport]
    if origin_airport != "frankfurt" and destination_airport != "frankfurt":
        flight_path.append("frankfurt")
    flight_path.append(destination_airport)
    for first, second in zip(flight_path, flight_path[1:]):
        if first != second:
            legs.append(_leg("flight", first, second))
    if destination != destination_airport:
        legs.append(_leg("bus", destination_airport, destination))
    return tuple(legs)


def _coverage_legs(origin: str, destination: str) -> tuple[RouteLegSeed, ...]:
    pair = frozenset((origin, destination))
    if pair in FERRY_CORRIDORS:
        return (_leg("ferry", origin, destination),)

    origin_gateway = AIRPORTLESS_GATEWAYS.get(
        origin, (origin, "", "", "")
    )[0]
    destination_gateway = AIRPORTLESS_GATEWAYS.get(
        destination, (destination, "", "", "")
    )[0]
    legs: list[RouteLegSeed] = []
    if origin_gateway != origin:
        legs.append(_access_leg(origin, origin_gateway))

    cross_water = (
        _region(origin_gateway) != _region(destination_gateway)
        and (
            _region(origin_gateway) != "mainland"
            or _region(destination_gateway) != "mainland"
        )
    )
    if origin_gateway != destination_gateway:
        if cross_water:
            legs.extend(_flight_legs(origin_gateway, destination_gateway))
        else:
            legs.append(_leg("bus", origin_gateway, destination_gateway))

    if destination_gateway != destination:
        legs.append(_access_leg(destination_gateway, destination))
    return tuple(legs)


def _dominant_leg(legs: tuple[RouteLegSeed, ...]) -> RouteLegSeed:
    return min(
        legs,
        key=lambda leg: (-leg.duration_minutes, MODE_PRIORITY[leg.mode]),
    )


def _dominant_mode(legs: tuple[RouteLegSeed, ...]) -> str:
    return _dominant_leg(legs).mode


def _route(
    origin: str,
    destination: str,
    legs: tuple[RouteLegSeed, ...],
    source_kind: str,
) -> RouteSeed:
    mode = _dominant_mode(legs)
    distance = max(20.0, distance_km(origin, destination))
    base_price = {
        "train": max(990, round(distance * 8)),
        "bus": max(690, round(distance * 5)),
        "flight": max(2990, round(distance * 6)),
        "ferry": max(1290, round(distance * 7)),
    }[mode]
    return RouteSeed(
        mode,
        origin,
        destination,
        legs[0].origin_point,
        legs[-1].destination_point,
        sum(leg.duration_minutes for leg in legs)
        + TRANSFER_BUFFER_MINUTES * (len(legs) - 1),
        base_price,
        (_dominant_leg(legs).company,),
        source_kind,
        legs,
    )


def _all_routes() -> tuple[RouteSeed, ...]:
    routes: list[RouteSeed] = []
    seen: set[tuple[str, str, str]] = set()
    for origin_index, origin in enumerate(LOCATIONS):
        for destination in LOCATIONS[origin_index + 1 :]:
            legs = _coverage_legs(origin.slug, destination.slug)
            route = _route(origin.slug, destination.slug, legs, "coverage")
            routes.append(route)
            seen.add((route.mode, *sorted((origin.slug, destination.slug))))

    for pair in TRAIN_CORRIDORS:
        origin, destination = sorted(pair)
        key = ("train", origin, destination)
        if key not in seen:
            routes.append(
                _route(
                    origin,
                    destination,
                    (_leg("train", origin, destination),),
                    "curated",
                )
            )
            seen.add(key)
    for pair in BUS_CORRIDORS:
        origin, destination = sorted(pair)
        key = ("bus", origin, destination)
        if key not in seen:
            routes.append(
                _route(
                    origin,
                    destination,
                    (_leg("bus", origin, destination),),
                    "curated",
                )
            )
            seen.add(key)
    return tuple(routes)


ROUTES = _all_routes()

# Retained manifest names describe the current strict-Europe catalog.
CAPITAL_MODE_PAIRS = tuple(
    (route.mode, route.origin, route.destination)
    for route in ROUTES
    if route.source_kind == "curated"
)
SOURCE_MODE_PAIRS = CAPITAL_MODE_PAIRS
SOURCE_GENERAL_PAIRS: tuple[tuple[str, str], ...] = ()
SOURCE_DESTINATION_SLUGS = tuple(location.slug for location in LOCATIONS)
SOURCE_COMPANY_ALIASES: dict[str, str] = {}


def company_modes() -> dict[str, str]:
    """Return the single transport mode assigned to every seeded company."""
    result: dict[str, str] = {}
    for route in ROUTES:
        assignments = [(company, route.mode) for company in route.companies]
        assignments.extend((leg.company, leg.mode) for leg in route.legs)
        for company, mode in assignments:
            previous = result.setdefault(company, mode)
            if previous != mode:
                raise ValueError(f"company {company!r} has conflicting modes")
    return result


SOURCE_COMPANIES = tuple(
    sorted({company for route in ROUTES for company in route.companies})
)
