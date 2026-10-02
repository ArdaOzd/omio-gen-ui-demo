"""Curated route and company inputs for the deterministic fare generator."""

from __future__ import annotations

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt


SOURCE_URL = "https://www.omio.com/"


@dataclass(frozen=True)
class LocationSeed:
    slug: str
    city: str
    country_code: str
    latitude: float
    longitude: float


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
    source_kind: str = "homepage"


_LOCATION_ROWS = (
    ("rome", "Rome", "IT", 41.9028, 12.4964),
    ("naples", "Naples", "IT", 40.8518, 14.2681),
    ("berlin", "Berlin", "DE", 52.5200, 13.4050),
    ("prague", "Prague", "CZ", 50.0755, 14.4378),
    ("budapest", "Budapest", "HU", 47.4979, 19.0402),
    ("vienna", "Vienna", "AT", 48.2082, 16.3738),
    ("florence", "Florence", "IT", 43.7696, 11.2558),
    ("amsterdam", "Amsterdam", "NL", 52.3676, 4.9041),
    ("venice", "Venice", "IT", 45.4408, 12.3155),
    ("london", "London", "GB", 51.5072, -0.1276),
    ("paris", "Paris", "FR", 48.8566, 2.3522),
    ("valencia", "Valencia", "ES", 39.4699, -0.3763),
    ("madrid", "Madrid", "ES", 40.4168, -3.7038),
    ("san-sebastian", "San Sebastian", "ES", 43.3183, -1.9812),
    ("bilbao", "Bilbao", "ES", 43.2630, -2.9350),
    ("lisbon", "Lisbon", "PT", 38.7223, -9.1393),
    ("lagos", "Lagos", "PT", 37.1028, -8.6730),
    ("vilnius", "Vilnius", "LT", 54.6872, 25.2797),
    ("minsk", "Minsk", "BY", 53.9006, 27.5590),
    ("bari", "Bari", "IT", 41.1171, 16.8719),
    ("alberobello", "Alberobello", "IT", 40.7845, 17.2366),
    ("porto", "Porto", "PT", 41.1579, -8.6291),
    ("seville", "Seville", "ES", 37.3891, -5.9845),
    ("brussels", "Brussels", "BE", 50.8503, 4.3517),
    ("sorrento", "Sorrento", "IT", 40.6263, 14.3758),
    ("malaga", "Malaga", "ES", 36.7213, -4.4214),
    ("barcelona", "Barcelona", "ES", 41.3874, 2.1686),
    ("milan", "Milan", "IT", 45.4642, 9.1900),
    ("nice", "Nice", "FR", 43.7102, 7.2620),
    ("zurich", "Zurich", "CH", 47.3769, 8.5417),
    ("hvar", "Hvar", "HR", 43.1729, 16.4411),
    ("split", "Split", "HR", 43.5081, 16.4402),
    ("palermo", "Palermo", "IT", 38.1157, 13.3615),
    ("positano", "Positano", "IT", 40.6281, 14.4850),
    ("praiano", "Praiano", "IT", 40.6129, 14.5247),
    ("corfu", "Corfu", "GR", 39.6243, 19.9217),
    ("ksamil", "Ksamil", "AL", 39.7680, 19.9996),
    ("oslo", "Oslo", "NO", 59.9139, 10.7522),
    ("copenhagen", "Copenhagen", "DK", 55.6761, 12.5683),
    ("palma", "Palma", "ES", 39.5696, 2.6502),
    ("ibiza", "Ibiza", "ES", 38.9067, 1.4206),
    ("dublin", "Dublin", "IE", 53.3498, -6.2603),
    ("holyhead", "Holyhead", "GB", 53.3095, -4.6330),
    ("stockholm", "Stockholm", "SE", 59.3293, 18.0686),
    ("gothenburg", "Gothenburg", "SE", 57.7089, 11.9746),
    ("helsinki", "Helsinki", "FI", 60.1699, 24.9384),
    ("tampere", "Tampere", "FI", 61.4978, 23.7610),
    ("malmo", "Malmo", "SE", 55.6050, 13.0038),
    ("new-york", "New York", "US", 40.7128, -74.0060),
    ("boston", "Boston", "US", 42.3601, -71.0589),
    ("toronto", "Toronto", "CA", 43.6532, -79.3832),
    ("montreal", "Montreal", "CA", 45.5019, -73.5674),
    ("munich", "Munich", "DE", 48.1351, 11.5820),
    ("miami", "Miami", "US", 25.7617, -80.1918),
    ("orlando", "Orlando", "US", 28.5383, -81.3792),
    ("athens", "Athens", "GR", 37.9838, 23.7275),
    ("santorini", "Santorini", "GR", 36.3932, 25.4615),
    ("philadelphia", "Philadelphia", "US", 39.9526, -75.1652),
    ("krakow", "Krakow", "PL", 50.0647, 19.9450),
    ("frankfurt", "Frankfurt am Main", "DE", 50.1109, 8.6821),
    ("chicago", "Chicago", "US", 41.8781, -87.6298),
    ("bratislava", "Bratislava", "SK", 48.1486, 17.1077),
    ("los-angeles", "Los Angeles", "US", 34.0522, -118.2437),
    ("granada", "Granada", "ES", 37.1773, -3.5986),
    ("lyon", "Lyon", "FR", 45.7640, 4.8357),
    ("alicante", "Alicante", "ES", 38.3452, -0.4810),
    ("cologne", "Cologne", "DE", 50.9375, 6.9603),
    ("geneva", "Geneva", "CH", 46.2044, 6.1432),
    ("hamburg", "Hamburg", "DE", 53.5511, 9.9937),
    ("edinburgh", "Edinburgh", "GB", 55.9533, -3.1883),
    ("london-heathrow-airport", "London Heathrow Airport", "GB", 51.4700, -0.4543),
    ("london-gatwick-airport", "London Gatwick Airport", "GB", 51.1537, -0.1821),
    ("skegness", "Skegness", "GB", 53.1437, 0.3363),
    ("warsaw", "Warsaw", "PL", 52.2297, 21.0122),
    ("zaragoza", "Zaragoza", "ES", 41.6488, -0.8891),
    ("birmingham", "Birmingham", "GB", 52.4862, -1.8904),
    ("zagreb", "Zagreb", "HR", 45.8150, 15.9819),
    ("bologna", "Bologna", "IT", 44.4949, 11.3426),
    ("catania", "Catania", "IT", 37.5079, 15.0830),
    ("manchester", "Manchester", "GB", 53.4808, -2.2426),
    ("dubai", "Dubai", "AE", 25.2048, 55.2708),
    ("washington-dc", "Washington, DC", "US", 38.9072, -77.0369),
    ("tangier", "Tangier", "MA", 35.7595, -5.8340),
    ("olbia", "Olbia", "IT", 40.9236, 9.4964),
    ("kalamata", "Kalamata", "GR", 37.0389, 22.1142),
    ("genoa", "Genoa", "IT", 44.4056, 8.9463),
    ("pisa", "Pisa", "IT", 43.7228, 10.4017),
    ("pescara", "Pescara", "IT", 42.4618, 14.2161),
    ("sardinia-island", "Sardinia (Island)", "IT", 40.1209, 9.0129),
    ("algeciras", "Algeciras", "ES", 36.1408, -5.4562),
    ("cagliari", "Cagliari", "IT", 39.2238, 9.1217),
    ("almeria", "Almeria", "ES", 36.8340, -2.4637),
    ("civitavecchia", "Civitavecchia", "IT", 42.0924, 11.7954),
    ("capri", "Capri", "IT", 40.5532, 14.2222),
    ("amalfi", "Amalfi", "IT", 40.6340, 14.6027),
    ("tokyo", "Tokyo", "JP", 35.6762, 139.6503),
    ("kyoto", "Kyoto", "JP", 35.0116, 135.7681),
    ("osaka", "Osaka", "JP", 34.6937, 135.5023),
    ("hiroshima", "Hiroshima", "JP", 34.3853, 132.4553),
    ("chamonix", "Chamonix", "FR", 45.9237, 6.8694),
    ("tossa-de-mar", "Tossa de Mar", "ES", 41.7202, 2.9316),
    ("le-grand-saconnex", "Le Grand-Saconnex", "CH", 46.2333, 6.1167),
    ("faro", "Faro", "PT", 37.0194, -7.9304),
    ("andorra", "Andorra", "AD", 42.5063, 1.5218),
    ("disneyland-paris", "Disneyland Paris", "FR", 48.8674, 2.7836),
    ("bristol", "Bristol", "GB", 51.4545, -2.5879),
    ("bath", "Bath", "GB", 51.3811, -2.3590),
    ("biarritz", "Biarritz", "FR", 43.4832, -1.5586),
    ("glasgow", "Glasgow", "GB", 55.8642, -4.2518),
    ("saint-tropez", "Saint-Tropez", "FR", 43.2677, 6.6407),
    ("monaco", "Monaco", "MC", 43.7384, 7.4246),
    ("marbella", "Marbella", "ES", 36.5101, -4.8824),
    ("dusseldorf", "Dusseldorf", "DE", 51.2277, 6.7735),
    ("antwerp", "Antwerp", "BE", 51.2194, 4.4025),
    ("zakynthos", "Zakynthos", "GR", 37.7870, 20.8999),
    ("antiparos", "Antiparos", "GR", 37.0394, 25.0826),
    ("st-malo", "St-Malo", "FR", 48.6493, -2.0257),
    ("brunnen", "Brunnen", "CH", 46.9936, 8.6051),
    ("lucerne", "Lucerne", "CH", 47.0502, 8.3093),
    ("los-cristianos", "Los Cristianos", "ES", 28.0500, -16.7170),
    ("las-palmas", "Las Palmas", "ES", 28.1235, -15.4363),
    ("piraeus", "Piraeus", "GR", 37.9420, 23.6465),
    ("hydra", "Hydra", "GR", 37.3499, 23.4650),
    ("cairnryan", "Cairnryan", "GB", 54.9656, -5.0166),
    ("belfast", "Belfast", "GB", 54.5973, -5.9301),
    ("luxembourg", "Luxembourg", "LU", 49.6116, 6.1319),
    ("como", "Como", "IT", 45.8081, 9.0852),
    ("segovia", "Segovia", "ES", 40.9429, -4.1088),
    ("istanbul", "Istanbul", "TR", 41.0082, 28.9784),
    ("antalya", "Antalya", "TR", 36.8969, 30.7133),
    ("gibraltar", "Gibraltar", "GI", 36.1408, -5.3536),
    ("igoumenitsa", "Igoumenitsa", "GR", 39.5034, 20.2673),
    ("stranraer", "Stranraer", "GB", 54.9021, -5.0276),
    ("larne", "Larne", "GB", 54.8578, -5.8236),
    ("benidorm", "Benidorm", "ES", 38.5411, -0.1225),
    ("mykonos", "Mykonos", "GR", 37.4467, 25.3289),
    ("paros", "Paros", "GR", 37.0856, 25.1488),
    ("chania", "Chania", "GR", 35.5138, 24.0180),
    ("dunkirk", "Dunkirk", "FR", 51.0344, 2.3768),
    ("dover", "Dover", "GB", 51.1279, 1.3134),
    ("kos", "Kos", "GR", 36.8915, 27.2877),
    ("rhodes", "Rhodes", "GR", 36.4341, 28.2176),
    ("rotterdam", "Rotterdam", "NL", 51.9244, 4.4777),
    ("colchester", "Colchester", "GB", 51.8959, 0.8919),
)

LOCATIONS = tuple(LocationSeed(*row) for row in _LOCATION_ROWS)


_BASE_ROUTES = (
    # Routes visible on the referenced Omio landing page.
    RouteSeed("train", "rome", "naples", "Roma Termini", "Napoli Centrale", 70, 1990, ("Italo", "Frecciarossa", "Trenitalia")),
    RouteSeed("train", "berlin", "prague", "Berlin Hbf", "Praha hlavni nadrazi", 250, 2990, ("Deutsche Bahn", "České dráhy")),
    RouteSeed("train", "budapest", "vienna", "Budapest Keleti", "Wien Hbf", 150, 1790, ("ÖBB", "České dráhy")),
    RouteSeed("train", "florence", "rome", "Firenze Santa Maria Novella", "Roma Termini", 95, 1790, ("Italo", "Frecciarossa", "Trenitalia")),
    RouteSeed("train", "berlin", "amsterdam", "Berlin Hbf", "Amsterdam Centraal", 390, 3990, ("Deutsche Bahn", "NS")),
    RouteSeed("train", "rome", "venice", "Roma Termini", "Venezia Santa Lucia", 230, 3290, ("Italo", "Frecciarossa", "Trenitalia")),
    RouteSeed("train", "london", "paris", "London St Pancras International", "Paris Gare du Nord", 140, 4990, ("Eurostar",)),
    RouteSeed("train", "florence", "venice", "Firenze Santa Maria Novella", "Venezia Santa Lucia", 125, 2290, ("Italo", "Frecciarossa", "Trenitalia")),
    RouteSeed("train", "vienna", "prague", "Wien Hbf", "Praha hlavni nadrazi", 240, 1990, ("ÖBB", "České dráhy")),
    RouteSeed("train", "valencia", "madrid", "Valencia Joaquin Sorolla", "Madrid Chamartin", 115, 1890, ("Renfe", "iryo", "Ouigo Spain")),
    RouteSeed("bus", "san-sebastian", "bilbao", "San Sebastian Donostia Bus Station", "Bilbao Intermodal", 85, 850, ("Alsa", "Costa Verde")),
    RouteSeed("bus", "lisbon", "lagos", "Lisboa Oriente", "Lagos Bus Terminal", 240, 1290, ("FlixBus", "Blablacar Bus")),
    RouteSeed("bus", "vilnius", "minsk", "Vilnius Bus Station", "Minsk Central Bus Station", 260, 1990, ("Infobus",)),
    RouteSeed("bus", "bari", "alberobello", "Bari Centrale Bus Stop", "Alberobello Via Cavour", 75, 690, ("FlixBus",)),
    RouteSeed("bus", "porto", "lisbon", "Porto Campanha Bus Terminal", "Lisboa Oriente", 195, 1090, ("FlixBus", "Blablacar Bus")),
    RouteSeed("bus", "seville", "lagos", "Sevilla Plaza de Armas", "Lagos Bus Terminal", 270, 1690, ("Alsa", "FlixBus")),
    RouteSeed("bus", "madrid", "seville", "Madrid Estacion Sur", "Sevilla Plaza de Armas", 390, 1890, ("Alsa", "FlixBus")),
    RouteSeed("bus", "madrid", "lisbon", "Madrid Estacion Sur", "Lisboa Oriente", 500, 2590, ("Alsa", "FlixBus")),
    RouteSeed("bus", "brussels", "london", "Brussels North Bus Station", "London Victoria Coach Station", 420, 2490, ("FlixBus", "National Express", "Blablacar Bus")),
    RouteSeed("bus", "sorrento", "rome", "Sorrento Corso Italia", "Rome Tiburtina Bus Station", 240, 1690, ("FlixBus",)),
    RouteSeed("flight", "malaga", "paris", "Malaga Airport", "Paris Orly Airport", 155, 4590, ("Vueling", "easyJet", "Ryanair")),
    RouteSeed("flight", "berlin", "london", "Berlin Brandenburg Airport", "London Gatwick Airport", 120, 3990, ("easyJet", "Ryanair", "British Airways")),
    RouteSeed("flight", "rome", "barcelona", "Rome Fiumicino Airport", "Barcelona El Prat Airport", 115, 4490, ("Vueling", "Ryanair", "Iberia")),
    RouteSeed("flight", "lisbon", "paris", "Lisbon Humberto Delgado Airport", "Paris Orly Airport", 150, 4990, ("Vueling", "easyJet", "Air France")),
    RouteSeed("flight", "milan", "paris", "Milan Malpensa Airport", "Paris Charles de Gaulle Airport", 90, 3990, ("easyJet", "Ryanair", "Air France")),
    RouteSeed("flight", "nice", "paris", "Nice Cote d'Azur Airport", "Paris Orly Airport", 90, 3490, ("easyJet", "Air France")),
    RouteSeed("flight", "zurich", "berlin", "Zurich Airport", "Berlin Brandenburg Airport", 95, 6990, ("Lufthansa", "easyJet")),
    RouteSeed("flight", "rome", "london", "Rome Fiumicino Airport", "London Gatwick Airport", 170, 4990, ("Ryanair", "Malta Air", "British Airways")),
    RouteSeed("ferry", "hvar", "split", "Hvar Port", "Split Ferry Port", 60, 1990, ("TP Line", "Kapetan Luka")),
    RouteSeed("ferry", "palermo", "naples", "Palermo Ferry Terminal", "Naples Beverello Port", 630, 4590, ("Grandi Navi Veloci", "Tirrenia")),
    RouteSeed("ferry", "positano", "naples", "Positano Ferry Port", "Naples Beverello Port", 75, 2390, ("NLG", "Alilauro", "Positano Jet")),
    RouteSeed("ferry", "naples", "praiano", "Naples Beverello Port", "Praiano Ferry Pier", 105, 2590, ("NLG", "Alilauro Gruson", "Positano Jet")),
    RouteSeed("ferry", "corfu", "ksamil", "Corfu Port", "Ksamil Ferry Pier", 55, 1990, ("Finikas Lines", "Ionian Seaways")),
    RouteSeed("ferry", "oslo", "copenhagen", "Oslo Ferry Terminal", "Copenhagen Ferry Terminal", 1080, 6990, ("DFDS",)),
    RouteSeed("ferry", "palma", "ibiza", "Palma de Mallorca Port", "Ibiza Port", 130, 3990, ("Balearia", "Trasmed")),
    RouteSeed("ferry", "dublin", "holyhead", "Dublin Port", "Holyhead Port", 195, 4290, ("Irish Ferries", "Stena Line")),
    # Supplementary synthetic routes cover providers and useful multi-mode searches.
    RouteSeed("bus", "london", "paris", "London Victoria Coach Station", "Paris Bercy Seine", 540, 2490, ("FlixBus", "National Express", "Blablacar Bus"), "supplementary"),
    RouteSeed("flight", "london", "paris", "London Gatwick Airport", "Paris Charles de Gaulle Airport", 80, 4490, ("easyJet", "British Airways", "Air France"), "supplementary"),
    RouteSeed("train", "zurich", "berlin", "Zurich HB", "Berlin Hbf", 500, 4990, ("SBB", "Deutsche Bahn"), "supplementary"),
    RouteSeed("train", "paris", "amsterdam", "Paris Gare du Nord", "Amsterdam Centraal", 210, 3990, ("SNCF", "NS"), "supplementary"),
    RouteSeed("train", "brussels", "paris", "Bruxelles-Midi", "Paris Gare du Nord", 85, 2990, ("SNCB", "SNCF"), "supplementary"),
    RouteSeed("train", "stockholm", "gothenburg", "Stockholm Central", "Goteborg Central", 185, 2490, ("SJ",), "supplementary"),
    RouteSeed("train", "helsinki", "tampere", "Helsinki Central", "Tampere Station", 110, 1990, ("VR Finland",), "supplementary"),
    RouteSeed("train", "copenhagen", "malmo", "Kobenhavn H", "Malmo Central", 40, 1290, ("Öresundståg",), "supplementary"),
    RouteSeed("train", "new-york", "boston", "New York Penn Station", "Boston South Station", 235, 3990, ("Amtrak",), "supplementary"),
    RouteSeed("train", "toronto", "montreal", "Toronto Union Station", "Montreal Central Station", 305, 4490, ("Via Rail Canada",), "supplementary"),
    RouteSeed("train", "porto", "lisbon", "Porto Campanha", "Lisboa Santa Apolonia", 170, 1690, ("Comboios",), "supplementary"),
    RouteSeed("bus", "prague", "vienna", "Prague Florenc", "Vienna Erdberg", 250, 1490, ("Regiojet", "FlixBus"), "supplementary"),
    RouteSeed("bus", "zurich", "munich", "Zurich Bus Station", "Munich Central Bus Station", 240, 1890, ("Swiss Tours", "FlixBus"), "supplementary"),
    RouteSeed("bus", "new-york", "boston", "New York Midtown Bus Stop", "Boston South Station", 270, 1990, ("OurBus", "Academy GoBuses", "Greyhound Bus"), "supplementary"),
    RouteSeed("bus", "miami", "orlando", "Miami Airport Intermodal", "Orlando Bus Station", 245, 2490, ("RedCoach", "Greyhound Bus"), "supplementary"),
    RouteSeed("bus", "barcelona", "rome", "Barcelona Nord Bus Station", "Rome Tiburtina Bus Station", 1320, 5990, ("FlixBus", "Blablacar Bus"), "supplementary"),
    RouteSeed("flight", "amsterdam", "paris", "Amsterdam Schiphol Airport", "Paris Charles de Gaulle Airport", 80, 4990, ("KLM", "Air France"), "supplementary"),
    RouteSeed("flight", "madrid", "paris", "Madrid Barajas Airport", "Paris Orly Airport", 125, 4990, ("Iberia", "Air France"), "supplementary"),
    RouteSeed("ferry", "athens", "santorini", "Athens Piraeus Port", "Santorini Athinios Port", 330, 4490, ("Seajets", "Blue Star Ferries"), "supplementary"),
)


# Mode headings in the pasted source apply to every pair until the next heading.
# Reverse service is generated automatically, so each undirected pair appears once.
_PASTED_TRAIN_PAIRS = (
    ("berlin", "london"), ("london", "madrid"), ("frankfurt", "london"),
    ("hamburg", "london"), ("edinburgh", "london"), ("london", "barcelona"),
    ("london", "munich"), ("bari", "london"), ("venice", "london"),
    ("vienna", "london"), ("london", "rome"), ("london", "brussels"),
    ("london", "lyon"), ("boston", "new-york"), ("milan", "london"),
    ("amsterdam", "london"), ("london", "florence"),
    ("london-heathrow-airport", "london"), ("zurich", "london"),
    ("london", "stockholm"), ("boston", "london"), ("london", "cologne"),
    ("lisbon", "porto"), ("madrid", "barcelona"), ("copenhagen", "stockholm"),
    ("paris", "amsterdam"), ("milan", "paris"), ("vienna", "bratislava"),
    ("new-york", "washington-dc"), ("barcelona", "paris"),
    ("madrid", "seville"), ("barcelona", "valencia"),
    ("stockholm", "copenhagen"),
    ("naples", "sorrento"), ("brussels", "paris"),
    # Added so both airport express companies pasted from the homepage have fares.
    ("london-gatwick-airport", "london"),
    ("tokyo", "kyoto"), ("tokyo", "osaka"), ("osaka", "kyoto"),
    ("osaka", "hiroshima"),
)

_PASTED_BUS_PAIRS = (
    ("london", "boston"), ("skegness", "london"), ("boston", "skegness"),
    ("london", "madrid"), ("london", "paris"), ("rome", "london"),
    ("milan", "london"), ("barcelona", "london"), ("new-york", "boston"),
    ("london", "lisbon"), ("warsaw", "london"), ("zaragoza", "london"),
    ("london", "oslo"), ("berlin", "london"), ("london", "munich"),
    ("prague", "london"), ("birmingham", "london"), ("zagreb", "london"),
    ("bologna", "london"), ("catania", "london"), ("naples", "london"),
    ("lyon", "london"), ("manchester", "london"), ("london", "frankfurt"),
    ("madrid", "barcelona"), ("paris", "amsterdam"),
    ("barcelona", "valencia"), ("brussels", "paris"),
    ("lisbon", "porto"), ("geneva", "chamonix"),
    ("barcelona", "tossa-de-mar"), ("chamonix", "le-grand-saconnex"),
    ("naples", "positano"), ("naples", "sorrento"), ("seville", "faro"),
    ("paris", "lisbon"), ("barcelona", "andorra"),
    ("seville", "granada"),
)

_PASTED_FLIGHT_PAIRS = (
    ("london", "new-york"), ("london", "paris"), ("paris", "new-york"),
    ("london", "madrid"), ("los-angeles", "london"), ("chicago", "london"),
    ("madrid", "new-york"), ("madrid", "paris"), ("berlin", "london"),
    ("los-angeles", "new-york"), ("los-angeles", "paris"),
    ("new-york", "chicago"), ("paris", "chicago"), ("london", "barcelona"),
    ("berlin", "new-york"), ("paris", "berlin"), ("london", "rome"),
    ("london", "milan"), ("dubai", "london"), ("washington-dc", "london"),
    ("boston", "london"), ("new-york", "barcelona"),
    ("berlin", "rome"), ("rome", "paris"), ("milan", "amsterdam"),
    ("paris", "barcelona"), ("paris", "chamonix"),
    ("paris", "saint-tropez"), ("paris", "naples"), ("paris", "monaco"),
    ("berlin", "barcelona"), ("berlin", "venice"), ("berlin", "athens"),
    ("barcelona", "marbella"), ("berlin", "helsinki"),
    ("rome", "munich"), ("vienna", "lisbon"), ("dusseldorf", "berlin"),
    ("paris", "prague"), ("faro", "paris"), ("antwerp", "london"),
    ("milan", "berlin"), ("paris", "warsaw"), ("milan", "lisbon"),
    ("berlin", "vienna"), ("bologna", "paris"),
)

_PASTED_FERRY_PAIRS = (
    ("barcelona", "venice"), ("barcelona", "palermo"),
    ("naples", "barcelona"), ("kalamata", "venice"), ("bari", "venice"),
    ("barcelona", "tangier"), ("barcelona", "olbia"),
    ("barcelona", "valencia"), ("kalamata", "athens"),
    ("genoa", "barcelona"), ("barcelona", "bologna"),
    ("barcelona", "pisa"), ("pescara", "barcelona"),
    ("palma", "barcelona"), ("barcelona", "rome"),
    ("barcelona", "sardinia-island"), ("algeciras", "barcelona"),
    ("bari", "kalamata"), ("cagliari", "barcelona"),
    ("barcelona", "ibiza"), ("barcelona", "almeria"),
    ("florence", "barcelona"), ("civitavecchia", "barcelona"),
    ("barcelona", "alicante"),
    ("antiparos", "athens"), ("st-malo", "dublin"),
    ("brunnen", "lucerne"), ("los-cristianos", "las-palmas"),
    ("amalfi", "praiano"), ("naples", "capri"), ("genoa", "pisa"),
    ("piraeus", "hydra"), ("genoa", "civitavecchia"),
    ("cairnryan", "belfast"), ("igoumenitsa", "venice"),
    ("stranraer", "larne"), ("sorrento", "capri"),
    ("benidorm", "ibiza"), ("mykonos", "paros"),
    ("chania", "santorini"), ("naples", "positano"),
    ("london", "amsterdam"), ("mykonos", "santorini"),
    ("dunkirk", "dover"), ("kos", "rhodes"),
    ("belfast", "stranraer"), ("rotterdam", "colchester"),
)

# These pasted corridors did not state a mode. They receive a plausible train or
# flight below and are excluded from mode-specific source assertions.
_PASTED_GENERAL_PAIRS = (
    ("madrid", "barcelona"), ("madrid", "valencia"), ("lisbon", "porto"),
    ("budapest", "vienna"), ("madrid", "seville"), ("rome", "florence"),
    ("prague", "vienna"), ("berlin", "london"), ("berlin", "paris"),
    ("rome", "berlin"), ("rome", "london"), ("milan", "berlin"),
    ("rome", "paris"), ("london", "milan"), ("madrid", "berlin"),
    ("paris", "milan"), ("madrid", "london"), ("berlin", "frankfurt"),
    ("barcelona", "berlin"), ("madrid", "paris"), ("vienna", "berlin"),
    ("berlin", "amsterdam"), ("berlin", "munich"), ("frankfurt", "london"),
    ("london", "barcelona"), ("berlin", "stockholm"), ("london", "vienna"),
    ("berlin", "cologne"),
    ("washington-dc", "new-york"), ("madrid", "segovia"),
    ("london", "amsterdam"), ("london", "edinburgh"),
    ("istanbul", "antalya"), ("malaga", "gibraltar"),
)

SOURCE_MODE_PAIRS = tuple(
    (mode, origin, destination)
    for mode, pairs in (
        ("train", _PASTED_TRAIN_PAIRS),
        ("bus", _PASTED_BUS_PAIRS),
        ("flight", _PASTED_FLIGHT_PAIRS),
        ("ferry", _PASTED_FERRY_PAIRS),
    )
    for origin, destination in pairs
)
SOURCE_GENERAL_PAIRS = _PASTED_GENERAL_PAIRS
SOURCE_DESTINATION_SLUGS = (
    "madrid", "paris", "barcelona", "prague", "vienna", "florence", "lisbon",
    "porto", "rome", "london", "amsterdam", "capri", "naples", "sorrento",
    "positano", "amalfi", "helsinki", "new-york", "boston", "philadelphia",
    "berlin", "milan", "krakow", "budapest", "frankfurt", "copenhagen",
    "chicago", "bratislava", "seville", "valencia", "malaga", "los-angeles",
    "athens", "granada", "lyon", "miami", "munich", "alicante", "cologne",
    "stockholm", "geneva", "brussels", "hamburg", "gothenburg",
    "chamonix", "disneyland-paris", "bristol", "bath", "biarritz", "glasgow",
    "oslo", "zakynthos", "luxembourg", "como",
)

SOURCE_COMPANIES = (
    "Italo", "Frecciarossa", "iryo", "Ouigo Spain", "České dráhy", "Trenitalia",
    "FlixBus", "Alsa", "Costa Verde", "National Express", "Swiss Tours", "Infobus",
    "Vueling", "easyJet", "Ryanair", "Malta Air", "Lufthansa", "Iberia",
    "Seajets", "NLG", "Alilauro", "Positano Jet", "Alilauro Gruson",
    "Blue Star Ferries", "Renfe", "Deutsche Bahn", "Eurostar", "SBB", "SNCF",
    "Gatwick Express", "Heathrow Express", "SJ", "NS", "British Airways", "ÖBB",
    "Air France", "SNCB", "KLM", "Amtrak", "Via Rail Canada", "Blablacar Bus",
    "Regiojet", "OurBus", "RedCoach", "Academy GoBuses", "Comboios", "VR Finland",
    "Greyhound Bus", "Öresundståg",
    "Travelmar", "SNAV", "DFDS",
)

SOURCE_COMPANY_ALIASES = {
    "BlaBlaCar Bus": "Blablacar Bus",
    "Flixbus": "FlixBus",
    "RegioJet": "Regiojet",
    "Greyhound bus": "Greyhound Bus",
    "DFDS Ferries": "DFDS",
    "NLG ferries": "NLG",
    "SNAV ferris": "SNAV",
}


def _distance_km(origin: str, destination: str) -> float:
    by_slug = {location.slug: location for location in LOCATIONS}
    first = by_slug[origin]
    second = by_slug[destination]
    lat1, lat2 = radians(first.latitude), radians(second.latitude)
    delta_lat = lat2 - lat1
    delta_lon = radians(second.longitude - first.longitude)
    haversine = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    return 6371 * 2 * asin(sqrt(haversine))


def _companies_for(mode: str, origin: str, destination: str) -> tuple[str, ...]:
    countries = {
        location.slug: location.country_code for location in LOCATIONS
    }
    pair_countries = {countries[origin], countries[destination]}
    pair = {origin, destination}
    if mode == "train":
        if "london-heathrow-airport" in pair:
            return ("Heathrow Express",)
        if "london-gatwick-airport" in pair:
            return ("Gatwick Express",)
        if "US" in pair_countries:
            return ("Amtrak",)
        if "CA" in pair_countries:
            return ("Via Rail Canada",)
        if "JP" in pair_countries:
            return ("JR Central",)
        if pair_countries == {"ES"}:
            return ("Renfe", "iryo", "Ouigo Spain")
        if pair_countries == {"IT"}:
            return ("Trenitalia", "Italo", "Frecciarossa")
        if pair_countries == {"DE"}:
            return ("Deutsche Bahn",)
        if pair_countries == {"FR"}:
            return ("SNCF",)
        if "GB" in pair_countries:
            return ("Eurostar",)
        if "SE" in pair_countries and "DK" in pair_countries:
            return ("Öresundståg", "SJ")
        if "SE" in pair_countries:
            return ("SJ",)
        if "AT" in pair_countries:
            return ("ÖBB",)
        if "CH" in pair_countries:
            return ("SBB",)
        if "NL" in pair_countries:
            return ("NS",)
        if "BE" in pair_countries:
            return ("SNCB",)
        if "PT" in pair_countries:
            return ("Comboios",)
        if "FI" in pair_countries:
            return ("VR Finland",)
        if "CZ" in pair_countries:
            return ("České dráhy",)
        return ("Deutsche Bahn", "SNCF")
    if mode == "bus":
        if "US" in pair_countries:
            if pair & {"miami", "orlando"}:
                return ("RedCoach", "Greyhound Bus")
            return ("Greyhound Bus", "OurBus", "Academy GoBuses")
        if "GB" in pair_countries:
            return ("National Express", "FlixBus")
        if "ES" in pair_countries:
            return ("Alsa", "FlixBus")
        if pair & {"prague", "vienna", "bratislava"}:
            return ("Regiojet", "FlixBus")
        return ("FlixBus", "Blablacar Bus")
    if mode == "flight":
        if "GB" in pair_countries:
            return ("easyJet", "British Airways", "Ryanair")
        if "ES" in pair_countries:
            return ("Vueling", "Iberia", "Ryanair")
        if "FR" in pair_countries:
            return ("Air France", "easyJet")
        if "DE" in pair_countries:
            return ("Lufthansa", "easyJet")
        if "NL" in pair_countries:
            return ("KLM", "easyJet")
        return ("Ryanair", "Malta Air", "Lufthansa")
    if mode == "ferry":
        if "GR" in pair_countries:
            return ("Seajets", "Blue Star Ferries")
        if "IT" in pair_countries:
            return (
                "NLG", "Alilauro", "Positano Jet", "Alilauro Gruson",
                "Travelmar", "SNAV",
            )
        return ("Seajets", "Blue Star Ferries")
    raise ValueError(f"unsupported mode {mode!r}")


def _synthetic_route(mode: str, origin: str, destination: str) -> RouteSeed:
    distance = max(20.0, _distance_km(origin, destination))
    duration = {
        "train": round(distance / 130 * 60 + 25),
        "bus": round(distance / 70 * 60 + 30),
        "flight": round(distance / 720 * 60 + 75),
        "ferry": round(distance / 45 * 60 + 30),
    }[mode]
    price = {
        "train": max(990, round(distance * 8)),
        "bus": max(690, round(distance * 5)),
        "flight": max(2990, round(distance * 6)),
        "ferry": max(1290, round(distance * 7)),
    }[mode]
    point_types = {
        "train": "Central Station",
        "bus": "Coach Station",
        "flight": "Airport",
        "ferry": "Ferry Terminal",
    }
    by_slug = {location.slug: location for location in LOCATIONS}
    point_type = point_types[mode]
    return RouteSeed(
        mode,
        origin,
        destination,
        f"{by_slug[origin].city} {point_type}",
        f"{by_slug[destination].city} {point_type}",
        max(20, duration),
        price,
        _companies_for(mode, origin, destination),
        "supplementary",
    )


def _all_routes() -> tuple[RouteSeed, ...]:
    routes = list(_BASE_ROUTES)
    seen = {
        (route.mode, *sorted((route.origin, route.destination))) for route in routes
    }
    for mode, origin, destination in SOURCE_MODE_PAIRS:
        key = (mode, *sorted((origin, destination)))
        if key not in seen:
            routes.append(_synthetic_route(mode, origin, destination))
            seen.add(key)
    route_pairs = {
        frozenset((route.origin, route.destination)) for route in routes
    }
    for origin, destination in SOURCE_GENERAL_PAIRS:
        pair = frozenset((origin, destination))
        if pair not in route_pairs:
            mode = "train" if _distance_km(origin, destination) <= 900 else "flight"
            routes.append(_synthetic_route(mode, origin, destination))
            route_pairs.add(pair)
    return tuple(routes)


ROUTES = _all_routes()


def company_modes() -> dict[str, str]:
    """Return the single transport mode assigned to every seeded company."""
    result: dict[str, str] = {}
    for route in ROUTES:
        for company in route.companies:
            previous = result.setdefault(company, route.mode)
            if previous != route.mode:
                raise ValueError(f"company {company!r} has conflicting modes")
    missing = sorted(set(SOURCE_COMPANIES) - result.keys())
    if missing:
        raise ValueError(f"source companies have no seeded route: {', '.join(missing)}")
    return result
