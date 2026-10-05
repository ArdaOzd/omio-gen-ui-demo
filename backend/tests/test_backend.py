from __future__ import annotations

import os
import shutil
import sqlite3
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

from backend import app

from backend.app import ApiError, dispatch, parse_search_query, search
from backend.generate_db import DEFAULT_ROW_COUNT, directional_routes, generate_database
from backend.seeds import (
    CAPITAL_MODE_PAIRS,
    LOCATIONS,
    ROUTES,
    SOURCE_COMPANIES,
    SOURCE_COMPANY_ALIASES,
    SOURCE_DESTINATION_SLUGS,
    SOURCE_GENERAL_PAIRS,
    SOURCE_MODE_PAIRS,
)
from backend.verify_db import verify_database


class BackendTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temporary_directory = tempfile.TemporaryDirectory()
        cls.database = Path(cls.temporary_directory.name) / "test.sqlite3"
        route_days = len(directional_routes()) * 3
        cls.summary = generate_database(
            cls.database,
            row_count=route_days * 4,
            start_date=date(2026, 10, 2),
            end_date=date(2026, 10, 4),
            seed=42,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary_directory.cleanup()

    def test_search_rejects_a_source_replaced_during_its_read(self) -> None:
        source = Path(self.temporary_directory.name) / "read-race.sqlite3"
        replacement = source.with_name("read-race-replacement.sqlite3")
        shutil.copy2(self.database, source)
        shutil.copy2(self.database, replacement)
        query = parse_search_query({"origin": ["london"], "destination": ["paris"], "departure_date": ["2026-10-02"]})
        original = app._search_leg

        def replace_after_read(*args, **kwargs):
            result = original(*args, **kwargs)
            os.replace(replacement, source)
            return result

        with patch.object(app, "_search_leg", side_effect=replace_after_read):
            with self.assertRaises(ApiError) as raised:
                search(source, query)
        self.assertEqual(raised.exception.status, 503)
        self.assertEqual(raised.exception.code, "source_changed")

    def test_source_version_changes_with_regenerated_fare_facts(self) -> None:
        changed = Path(self.temporary_directory.name) / "changed-source.sqlite3"
        shutil.copy2(self.database, changed)
        query = parse_search_query({"origin": ["london"], "destination": ["paris"], "departure_date": ["2026-10-02"]})
        first = search(changed, query)
        first_version = first["source_version"]
        row = first["outbound"]["results"][0]
        with sqlite3.connect(changed) as connection:
            connection.execute("UPDATE fares SET price_cents = price_cents + 1 WHERE id = ?", (int(row["id"].split("_")[1]),))
        stat = changed.stat()
        os.utime(changed, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
        second = search(changed, query)
        self.assertNotEqual(first_version, second["source_version"])
        refreshed = next(item for item in second["outbound"]["results"] if item["id"] == row["id"])
        self.assertEqual(refreshed["price_cents"], row["price_cents"] + 1)
        self.assertEqual(refreshed["duration_minutes"], row["duration_minutes"])
        for endpoint in ("/api/health", "/api/metadata"):
            status, payload = dispatch(changed, endpoint, {})
            self.assertEqual(status, 200)
            self.assertEqual(payload["source_version"], second["source_version"])

    def test_generator_is_exact_and_covers_every_route_every_day(self) -> None:
        expected_cells = len(directional_routes()) * 3
        with sqlite3.connect(self.database) as connection:
            count = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
            covered_cells = connection.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT route_id, service_date FROM fares GROUP BY route_id, service_date
                )
                """
            ).fetchone()[0]
            invalid_seats = connection.execute(
                "SELECT COUNT(*) FROM fares WHERE available_seats < 0"
            ).fetchone()[0]
            integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        self.assertEqual(count, expected_cells * 4)
        self.assertEqual(covered_cells, expected_cells)
        self.assertEqual(invalid_seats, 0)
        self.assertEqual(integrity, "ok")
        verification = verify_database(
            self.database, expected_rows=expected_cells * 4
        )
        self.assertEqual(verification["route_day_count"], expected_cells)

    def test_catalog_covers_common_european_capitals_without_us_locations(self) -> None:
        capital_codes = {
            "amsterdam": "NL", "andorra-la-vella": "AD", "ankara": "TR",
            "athens": "GR", "baku": "AZ", "belgrade": "RS", "berlin": "DE", "bern": "CH",
            "bratislava": "SK", "brussels": "BE", "bucharest": "RO",
            "budapest": "HU", "chisinau": "MD", "copenhagen": "DK",
            "dublin": "IE", "helsinki": "FI", "kyiv": "UA", "lisbon": "PT",
            "ljubljana": "SI", "london": "GB", "luxembourg": "LU",
            "madrid": "ES", "minsk": "BY", "monaco": "MC", "moscow": "RU",
            "nicosia": "CY", "oslo": "NO", "paris": "FR", "podgorica": "ME",
            "prague": "CZ", "pristina": "XK", "reykjavik": "IS", "riga": "LV",
            "rome": "IT", "san-marino": "SM", "sarajevo": "BA", "skopje": "MK",
            "sofia": "BG", "stockholm": "SE", "tallinn": "EE", "tirana": "AL",
            "vaduz": "LI", "valletta": "MT", "vatican-city": "VA",
            "tbilisi": "GE", "vienna": "AT", "vilnius": "LT", "warsaw": "PL",
            "yerevan": "AM", "zagreb": "HR",
        }
        expected_capitals = set(capital_codes)
        location_by_slug = {location.slug: location for location in LOCATIONS}
        self.assertLessEqual(expected_capitals, location_by_slug.keys())
        self.assertEqual(
            {slug: location_by_slug[slug].country_code for slug in expected_capitals},
            capital_codes,
        )
        self.assertFalse(
            [location.slug for location in LOCATIONS if location.country_code == "US"]
        )
        removed_us_slugs = {
            "new-york", "boston", "miami", "orlando", "philadelphia", "chicago",
            "los-angeles", "washington-dc",
        }
        seeded_endpoints = {
            endpoint for route in ROUTES for endpoint in (route.origin, route.destination)
        }
        source_endpoints = {
            endpoint
            for item in (*SOURCE_MODE_PAIRS, *CAPITAL_MODE_PAIRS)
            for endpoint in item[-2:]
        } | {endpoint for pair in SOURCE_GENERAL_PAIRS for endpoint in pair}
        self.assertTrue(removed_us_slugs.isdisjoint(location_by_slug))
        self.assertTrue(removed_us_slugs.isdisjoint(seeded_endpoints))
        self.assertTrue(removed_us_slugs.isdisjoint(source_endpoints))
        self.assertLessEqual(seeded_endpoints, location_by_slug.keys())

        capital_routes = [
            route
            for route in directional_routes()
            if route.origin in expected_capitals or route.destination in expected_capitals
        ]
        connected_capitals = {
            endpoint
            for route in capital_routes
            for endpoint in (route.origin, route.destination)
            if endpoint in expected_capitals
        }
        self.assertEqual(connected_capitals, expected_capitals)
        self.assertGreaterEqual(
            len({route.origin for route in capital_routes if route.mode == "flight"}), 20
        )
        self.assertGreaterEqual(
            len({route.origin for route in capital_routes if route.mode == "train"}), 20
        )
        self.assertGreaterEqual(
            len({route.origin for route in capital_routes if route.mode == "bus"}), 25
        )
        capital_ferry_pairs = {
            frozenset((route.origin, route.destination))
            for route in capital_routes
            if route.mode == "ferry"
        }
        self.assertEqual(
            capital_ferry_pairs,
            {
                frozenset(("dublin", "holyhead")),
                frozenset(("helsinki", "tallinn")),
                frozenset(("stockholm", "helsinki")),
                frozenset(("oslo", "copenhagen")),
            },
        )
        airportless = {"andorra-la-vella", "vaduz", "monaco", "san-marino", "vatican-city"}
        trainless_microstates = {"andorra-la-vella", "vaduz", "san-marino", "vatican-city"}
        self.assertFalse(
            [route for route in capital_routes if route.mode == "flight" and airportless & {route.origin, route.destination}]
        )
        self.assertFalse(
            [route for route in capital_routes if route.mode == "train" and trainless_microstates & {route.origin, route.destination}]
        )

    def test_default_dataset_size_and_seeded_variation(self) -> None:
        self.assertEqual(DEFAULT_ROW_COUNT, 10_000_000)
        route_days = len(directional_routes())
        same_seed = Path(self.temporary_directory.name) / "same-seed.sqlite3"
        repeated_seed = Path(self.temporary_directory.name) / "repeated-seed.sqlite3"
        changed_seed = Path(self.temporary_directory.name) / "changed-seed.sqlite3"
        for output, seed in ((same_seed, 42), (repeated_seed, 42), (changed_seed, 43)):
            generate_database(
                output,
                row_count=route_days * 4,
                start_date=date(2026, 10, 2),
                end_date=date(2026, 10, 2),
                seed=seed,
            )

        def fare_signature(database: Path) -> list[tuple[object, ...]]:
            with sqlite3.connect(database) as connection:
                return connection.execute(
                    """
                    SELECT route_id, company_id, departure_time, duration_minutes,
                           price_cents, available_seats
                    FROM fares ORDER BY id
                    """
                ).fetchall()

        original = fare_signature(same_seed)
        repeated = fare_signature(repeated_seed)
        changed = fare_signature(changed_seed)
        self.assertEqual(original, repeated)
        self.assertNotEqual(original, changed)
        self.assertNotEqual(
            [row[1] for row in repeated],
            [row[1] for row in changed],
            "changing the seed should also vary operator assignment",
        )

        with sqlite3.connect(same_seed) as connection:
            outside_windows = connection.execute(
                """
                SELECT COUNT(*)
                FROM fares f JOIN routes r ON r.id = f.route_id
                WHERE (r.mode = 'train' AND time(f.departure_time) NOT BETWEEN '05:00:00' AND '23:30:59')
                   OR (r.mode = 'bus' AND time(f.departure_time) NOT BETWEEN '04:00:00' AND '23:45:59')
                   OR (r.mode = 'flight' AND time(f.departure_time) NOT BETWEEN '05:00:00' AND '23:30:59')
                   OR (r.mode = 'ferry' AND time(f.departure_time) NOT BETWEEN '05:00:00' AND '23:00:59')
                """
            ).fetchone()[0]
        self.assertEqual(outside_windows, 0)

        distributed = Path(self.temporary_directory.name) / "distributed.sqlite3"
        distribution_days = 14
        generate_database(
            distributed,
            row_count=route_days * distribution_days * 4 + 137,
            start_date=date(2026, 10, 1),
            end_date=date(2026, 10, distribution_days),
            seed=42,
        )
        with sqlite3.connect(distributed) as connection:
            daily_counts = [
                row[0]
                for row in connection.execute(
                    "SELECT COUNT(*) FROM fares GROUP BY service_date ORDER BY service_date"
                )
            ]
        self.assertGreater(len(set(daily_counts)), 1)
        self.assertGreaterEqual(
            sum(count > route_days * 4 for count in daily_counts),
            distribution_days // 2,
            "remainder fares should be distributed instead of front-loaded",
        )
        mean_daily_count = sum(daily_counts) / len(daily_counts)
        self.assertLess(max(daily_counts) - min(daily_counts), mean_daily_count * 0.15)

    def test_minimum_and_non_divisible_row_counts(self) -> None:
        cells = len(directional_routes())
        for row_count in (1, 17, cells - 1):
            with self.subTest(row_count=row_count):
                database = Path(self.temporary_directory.name) / f"rows-{row_count}.sqlite3"
                with self.assertRaisesRegex(ValueError, "cover every route on every date"):
                    generate_database(
                        database,
                        row_count=row_count,
                        start_date=date(2026, 10, 2),
                        end_date=date(2026, 10, 2),
                        seed=42,
                    )

        for row_count in (cells, cells + 137):
            with self.subTest(row_count=row_count):
                database = Path(self.temporary_directory.name) / f"rows-{row_count}.sqlite3"
                generate_database(
                    database,
                    row_count=row_count,
                    start_date=date(2026, 10, 2),
                    end_date=date(2026, 10, 2),
                    seed=42,
                )
                with sqlite3.connect(database) as connection:
                    actual = connection.execute("SELECT COUNT(*) FROM fares").fetchone()[0]
                    duplicates = connection.execute(
                        """
                        SELECT COUNT(*) FROM (
                            SELECT route_id, company_id, departure_time
                            FROM fares
                            GROUP BY route_id, company_id, departure_time
                            HAVING COUNT(*) > 1
                        )
                        """
                    ).fetchone()[0]
                self.assertEqual(actual, row_count)
                self.assertEqual(duplicates, 0)

    def test_pasted_source_catalog_is_fully_covered(self) -> None:
        location_slugs = {location.slug for location in LOCATIONS}
        self.assertLessEqual(set(SOURCE_DESTINATION_SLUGS), location_slugs)
        mode_pairs = {
            (route.mode, route.origin, route.destination) for route in directional_routes()
        }
        self.assertTrue(
            all(requirement in mode_pairs for requirement in SOURCE_MODE_PAIRS)
        )
        all_pairs = {
            (route.origin, route.destination) for route in directional_routes()
        }
        self.assertTrue(all(pair in all_pairs for pair in SOURCE_GENERAL_PAIRS))
        seeded_companies = {
            company for route in ROUTES for company in route.companies
        }
        self.assertLessEqual(set(SOURCE_COMPANIES), seeded_companies)
        self.assertLessEqual(set(SOURCE_COMPANY_ALIASES.values()), seeded_companies)
        self.assertEqual(
            sum(route.source_kind == "homepage" for route in ROUTES), 36
        )

        with sqlite3.connect(self.database) as connection:
            database_locations = {
                row[0] for row in connection.execute("SELECT slug FROM locations")
            }
            database_routes = {
                (mode, origin, destination)
                for mode, origin, destination in connection.execute(
                    """
                    SELECT r.mode, origin.slug, destination.slug
                    FROM routes r
                    JOIN locations origin ON origin.id = r.origin_location_id
                    JOIN locations destination ON destination.id = r.destination_location_id
                    """
                )
            }
            providers_with_fares = {
                row[0]
                for row in connection.execute(
                    """
                    SELECT c.name FROM companies c
                    JOIN fares f ON f.company_id = c.id
                    GROUP BY c.id HAVING COUNT(f.id) > 0
                    """
                )
            }
        self.assertLessEqual(set(SOURCE_DESTINATION_SLUGS), database_locations)
        self.assertTrue(
            all(requirement in database_routes for requirement in SOURCE_MODE_PAIRS)
        )
        database_pairs = {(origin, destination) for _, origin, destination in database_routes}
        self.assertTrue(all(pair in database_pairs for pair in SOURCE_GENERAL_PAIRS))
        self.assertLessEqual(set(SOURCE_COMPANIES), providers_with_fares)
        self.assertLessEqual(
            set(SOURCE_COMPANY_ALIASES.values()), providers_with_fares
        )

    def test_metadata_and_location_routes_are_exposed(self) -> None:
        status, metadata = dispatch(self.database, "/api/metadata", {})
        self.assertEqual(status, 200)
        self.assertEqual(metadata["timetable"]["start_date"], "2026-10-02")
        self.assertEqual(set(metadata["modes"]), {"train", "bus", "flight", "ferry"})
        self.assertTrue(any(route["source_kind"] == "supplementary" for route in metadata["routes"]))

        status, payload = dispatch(self.database, "/api/locations", {})
        self.assertEqual(status, 200)
        london = next(item for item in payload["locations"] if item["id"] == "london")
        paris = next(item for item in london["destinations"] if item["id"] == "paris")
        self.assertEqual(set(paris["modes"]), {"train", "bus", "flight"})

    def test_search_returns_available_outbound_and_return_results(self) -> None:
        parsed = parse_search_query(
            {
                "origin": ["london"],
                "destination": ["paris"],
                "departure_date": ["2026-10-02"],
                "return_date": ["2026-10-03"],
                "passengers": ["2"],
                "mode": ["all"],
                "sort": ["price_asc"],
                "page": ["1"],
                "limit": ["100"],
            }
        )
        payload = search(self.database, parsed)
        self.assertIsNotNone(payload["return"])
        self.assertEqual(payload["outbound"]["origin"], "london")
        self.assertEqual(payload["return"]["origin"], "paris")
        outbound = payload["outbound"]["results"]
        self.assertTrue(outbound)
        self.assertEqual({item["mode"] for item in outbound}, {"train", "bus", "flight"})
        self.assertTrue(all(item["available_seats"] >= 2 for item in outbound))
        self.assertTrue(
            all(
                {"count", "minimum_price_cents", "minimum_duration_minutes"}
                <= set(summary)
                for summary in payload["outbound"]["mode_summaries"].values()
            )
        )
        self.assertEqual(
            [item["price_cents"] for item in outbound],
            sorted(item["price_cents"] for item in outbound),
        )

    def test_all_sort_orders_and_pagination(self) -> None:
        expected_reverse = {
            "price_asc": False,
            "price_desc": True,
            "duration_asc": False,
            "duration_desc": True,
        }
        for sort, reverse in expected_reverse.items():
            with self.subTest(sort=sort):
                query = parse_search_query(
                    {
                        "origin": ["barcelona"],
                        "destination": ["rome"],
                        "departure_date": ["2026-10-02"],
                        "mode": ["all"],
                        "sort": [sort],
                        "limit": ["100"],
                    }
                )
                rows = search(self.database, query)["outbound"]["results"]
                field = "price_cents" if sort.startswith("price") else "duration_minutes"
                values = [row[field] for row in rows]
                self.assertEqual(values, sorted(values, reverse=reverse))
                self.assertEqual({row["mode"] for row in rows}, {"bus", "flight"})

        base = {
            "origin": ["london"],
            "destination": ["paris"],
            "departure_date": ["2026-10-02"],
            "limit": ["2"],
        }
        page_one = search(self.database, parse_search_query(base))["outbound"]
        page_two = search(
            self.database, parse_search_query({**base, "page": ["2"]})
        )["outbound"]
        self.assertGreater(page_one["total"], 2)
        self.assertTrue(
            {row["id"] for row in page_one["results"]}.isdisjoint(
                row["id"] for row in page_two["results"]
            )
        )

    def test_invalid_inputs_are_rejected_at_the_boundary(self) -> None:
        invalid_queries = (
            {},
            {
                "origin": ["rome"],
                "destination": ["rome"],
                "departure_date": ["2026-10-02"],
            },
            {
                "origin": ["rome"],
                "destination": ["paris"],
                "departure_date": ["not-a-date"],
            },
            {
                "origin": ["rome"],
                "destination": ["paris"],
                "departure_date": ["2026-10-03"],
                "return_date": ["2026-10-02"],
            },
            {
                "origin": ["rome"],
                "destination": ["paris"],
                "departure_date": ["2026-10-02"],
                "passengers": ["0"],
            },
            {
                "origin": ["rome"],
                "destination": ["paris"],
                "departure_date": ["2026-10-02"],
                "sort": ["fastest"],
            },
        )
        for query in invalid_queries:
            with self.subTest(query=query), self.assertRaises(ApiError):
                parse_search_query(query)

        out_of_range = parse_search_query(
            {
                "origin": ["london"],
                "destination": ["paris"],
                "departure_date": ["2027-01-01"],
            }
        )
        with self.assertRaises(ApiError):
            search(self.database, out_of_range)


if __name__ == "__main__":
    unittest.main()
