from __future__ import annotations

import json
import os
import shutil
import sqlite3
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from http import HTTPStatus
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch

from backend import app as app_module
from backend.app import MAX_REQUEST_BODY_BYTES, dispatch, dispatch_post, make_handler
from backend.generate_db import directional_routes, generate_database
from backend.query_groups import QueryApiError, _cursor_hash, _encode_cursor, execute_query_groups, stable_ref


class QueryGroupsTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temporary_directory = tempfile.TemporaryDirectory()
        cls.database = Path(cls.temporary_directory.name) / "query-groups.sqlite3"
        route_days = len(directional_routes()) * 3
        generate_database(
            cls.database,
            row_count=route_days * 8,
            start_date=date(2026, 10, 2),
            end_date=date(2026, 10, 4),
            seed=73,
        )
        _, health = dispatch(cls.database, "/api/health", {})
        cls.source_version = health["source_version"]

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temporary_directory.cleanup()

    def scope(self, **overrides: object) -> dict[str, object]:
        value: dict[str, object] = {
            "kind": "fareScope",
            "originId": "london",
            "destinationId": "paris",
            "dateWindow": {"from": "2026-10-02", "to": "2026-10-04"},
            "passengers": 1,
            "earliestDeparture": {"date": "2026-10-02", "minutes": 0},
        }
        value.update(overrides)
        return value

    @staticmethod
    def filters(**overrides: object) -> dict[str, object]:
        value: dict[str, object] = {"modes": [], "carrierIds": [], "directOnly": False}
        value.update(overrides)
        return value

    def request(self, projections: list[dict[str, object]], **overrides: object) -> dict[str, object]:
        value: dict[str, object] = {
            "version": 1,
            "requestId": "request-1",
            "expectedSourceVersion": None,
            "groups": [{"groupId": "artifact-1:leg:london:paris", "scope": self.scope(), "projections": projections}],
        }
        value.update(overrides)
        return value

    def fare_page(self, **overrides: object) -> dict[str, object]:
        value: dict[str, object] = {
            "projectionId": "ordered",
            "kind": "farePage",
            "filters": self.filters(),
            "serviceDate": None,
            "sort": {"field": "departureMinutes", "direction": "asc"},
            "after": None,
            "limit": 2,
        }
        value.update(overrides)
        return value

    def execute(self, projections: list[dict[str, object]]) -> dict[str, object]:
        status, payload = dispatch_post(self.database, "/api/query-groups", self.request(projections))
        self.assertEqual(status, HTTPStatus.OK)
        return payload

    def assert_fare_legs(self, fare: dict[str, object]) -> None:
        legs = fare["legs"]
        self.assertTrue(legs)
        self.assertEqual(
            [leg["legIndex"] for leg in legs],
            list(range(len(legs))),
        )
        self.assertEqual(legs[0]["originId"], fare["originId"])
        self.assertEqual(legs[-1]["destinationId"], fare["destinationId"])
        self.assertEqual(fare["direct"], len(legs) == 1)
        for current, following in zip(legs[:-1], legs[1:], strict=True):
            self.assertEqual(current["destinationId"], following["originId"])

    def test_fixed_projection_batch_returns_clean_fares_and_semantic_aggregates(self) -> None:
        payload = self.execute(
            [
                self.fare_page(limit=100),
                {"projectionId": "calendar", "kind": "calendarDays", "filters": self.filters(), "objective": "cheapest"},
                {"projectionId": "carriers", "kind": "carrierFacets", "filters": self.filters(carrierIds=["carrier-does-not-exist"])},
                {"projectionId": "modes", "kind": "modeSummary", "filters": self.filters(modes=["train"]), "baseline": "withoutModeFilter"},
                {"projectionId": "active-modes", "kind": "modeSummary", "filters": self.filters(modes=["train"]), "baseline": "active"},
                {"projectionId": "highlights", "kind": "fareHighlights", "filters": self.filters()},
            ]
        )
        self.assertEqual(payload["version"], 1)
        self.assertEqual(payload["requestId"], "request-1")
        self.assertEqual(payload["sourceVersion"], self.source_version)
        group = payload["groups"][0]
        manifest = group["manifest"]
        self.assertTrue(manifest["complete"])
        self.assertEqual(manifest["coverage"], self.scope())
        self.assertEqual(manifest["availableDateWindow"], self.scope()["dateWindow"])
        self.assertEqual(manifest["source"]["descriptorId"], manifest["resourceKey"])
        projections = {projection["projectionId"]: projection for projection in group["projections"]}
        page = projections["ordered"]
        self.assertEqual(page["pageInfo"]["total"], manifest["totalAvailable"])
        self.assertEqual(page["pageInfo"]["returned"], len(page["items"]))
        fare_keys = {
            "id", "originId", "destinationId", "serviceDate", "mode", "carrierId",
            "carrierName", "priceCents", "durationMinutes", "departureMinutes",
            "availableSeats", "currency", "synthetic", "priceBasis", "direct", "legs",
        }
        self.assertEqual(set(page["items"][0]), fare_keys)
        self.assertNotIn("arrivalMinutes", page["items"][0])
        self.assertNotIn("transfers", page["items"][0])
        for fare in page["items"]:
            self.assert_fare_legs(fare)
        self.assertEqual(
            page["items"][0]["carrierId"],
            f'carrier-{stable_ref(page["items"][0]["carrierName"])}',
        )
        self.assertEqual([day["date"] for day in projections["calendar"]["days"]], ["2026-10-02", "2026-10-03", "2026-10-04"])
        for day in projections["calendar"]["days"]:
            day_fares = [fare for fare in page["items"] if fare["serviceDate"] == day["date"]]
            self.assertEqual(day["count"], len(day_fares))
            self.assertEqual(
                day["representative"]["id"],
                min(day_fares, key=lambda fare: (fare["priceCents"], fare["departureMinutes"], fare["id"]))["id"],
            )
        self.assertGreater(len(projections["carriers"]["options"]), 1, "carrier facets must ignore their own active filter")
        self.assertGreater(len(projections["modes"]["modes"]), 1)
        self.assertEqual([mode["mode"] for mode in projections["active-modes"]["modes"]], ["train"])
        self.assertEqual(projections["highlights"]["cheapest"]["id"], min(page["items"], key=lambda fare: (fare["priceCents"], fare["serviceDate"], fare["departureMinutes"], fare["id"]))["id"])
        self.assertEqual(projections["highlights"]["fastest"]["id"], min(page["items"], key=lambda fare: (fare["durationMinutes"], fare["serviceDate"], fare["departureMinutes"], fare["id"]))["id"])
        for projection in projections.values():
            self.assertTrue(projection["inputHash"].startswith("input-"))
            self.assertTrue(projection["resultFingerprint"].startswith("result-"))
        projection_input = self.fare_page(limit=100)
        projection_input.pop("projectionId")
        expected_input = {"scope": self.scope(), "projection": projection_input}
        encoded_input = json.dumps(expected_input, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        self.assertEqual(page["inputHash"], f"input-{stable_ref(encoded_input)}")

    def test_cursor_pagination_is_stable_and_bound_to_normalized_input(self) -> None:
        first = self.execute([self.fare_page(limit=3)])["groups"][0]["projections"][0]
        self.assertTrue(first["pageInfo"]["hasNextPage"])
        second_projection = self.fare_page(limit=3, after=first["pageInfo"]["nextCursor"])
        second_projection["projectionId"] = "page-two"
        second = self.execute([second_projection])["groups"][0]["projections"][0]
        self.assertEqual(second["projectionId"], "page-two")
        self.assertTrue({fare["id"] for fare in first["items"]}.isdisjoint(fare["id"] for fare in second["items"]))

        changed_filter = self.fare_page(
            limit=3,
            after=first["pageInfo"]["nextCursor"],
            filters=self.filters(modes=["train"]),
        )
        with self.assertRaises(QueryApiError) as raised:
            dispatch_post(self.database, "/api/query-groups", self.request([changed_filter]))
        self.assertEqual((raised.exception.status, raised.exception.code), (HTTPStatus.CONFLICT, "staleCursor"))

        malformed = self.fare_page(after="not-a-cursor")
        with self.assertRaises(QueryApiError) as raised:
            dispatch_post(self.database, "/api/query-groups", self.request([malformed]))
        self.assertEqual(raised.exception.code, "staleCursor")

        typed_wrong = self.fare_page()
        typed_wrong["after"] = _encode_cursor(
            self.source_version,
            _cursor_hash(self.scope(), typed_wrong),
            [12, "not-a-date", 500],
        )
        with self.assertRaises(QueryApiError) as raised:
            dispatch_post(self.database, "/api/query-groups", self.request([typed_wrong]))
        self.assertEqual(raised.exception.code, "staleCursor")

    def test_departure_sort_and_cursor_are_chronological_across_dates(self) -> None:
        after = None
        items: list[dict[str, object]] = []
        while True:
            projection = self.fare_page(limit=17, after=after)
            page = self.execute([projection])["groups"][0]["projections"][0]
            items.extend(page["items"])
            after = page["pageInfo"]["nextCursor"]
            if after is None:
                break
        keys = [(fare["serviceDate"], fare["departureMinutes"], fare["id"]) for fare in items]
        self.assertEqual(keys, sorted(keys))
        self.assertEqual(len({fare["id"] for fare in items}), len(items))
        self.assertEqual(len(items), page["pageInfo"]["total"])

        descending = self.execute([
            self.fare_page(limit=100, sort={"field": "departureMinutes", "direction": "desc"})
        ])["groups"][0]["projections"][0]["items"]
        descending_pairs = [(fare["serviceDate"], fare["departureMinutes"]) for fare in descending]
        self.assertEqual(descending_pairs, sorted(descending_pairs, reverse=True))

    def test_empty_projection_group_loads_complete_scope_without_items(self) -> None:
        group = self.execute([])["groups"][0]
        self.assertEqual(group["projections"], [])
        self.assertGreater(group["manifest"]["totalAvailable"], 0)
        self.assertTrue(group["manifest"]["complete"])

    def test_resource_key_identifies_logical_scope_across_source_generations(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.row_factory = sqlite3.Row
            first = execute_query_groups(connection, self.request([]), "source-generation-1")
            second = execute_query_groups(connection, self.request([]), "source-generation-2")
        first_manifest = first["groups"][0]["manifest"]
        second_manifest = second["groups"][0]["manifest"]
        self.assertEqual(first_manifest["resourceKey"], second_manifest["resourceKey"])
        self.assertEqual(first_manifest["source"]["descriptorId"], first_manifest["resourceKey"])
        self.assertEqual(second_manifest["source"]["descriptorId"], second_manifest["resourceKey"])
        self.assertNotEqual(first_manifest["source"]["sourceVersion"], second_manifest["source"]["sourceVersion"])

    def test_lookup_is_source_scoped_deduplicated_and_independent_of_pages(self) -> None:
        group = self.execute([self.fare_page(limit=1)])["groups"][0]
        fare = group["projections"][0]["items"][0]
        resource_key = group["manifest"]["resourceKey"]
        request = {
            "version": 1,
            "requestId": "lookup-1",
            "sourceVersion": self.source_version,
            "pins": [
                {"fareId": fare["id"], "resourceKey": resource_key},
                {"fareId": "fare_999999999", "resourceKey": resource_key},
            ],
        }
        status, payload = dispatch_post(self.database, "/api/lookup", request)
        self.assertEqual(status, HTTPStatus.OK)
        self.assertEqual([item["id"] for item in payload["items"]], [fare["id"]])
        self.assertEqual(payload["missingPins"], [{"fareId": "fare_999999999", "resourceKey": resource_key}])

        wrong_scope = self.scope(
            originId="paris",
            destinationId="london",
        )
        wrong_scope_request = self.request(
            [],
            groups=[{
                "groupId": "artifact-2:leg:paris:london",
                "scope": wrong_scope,
                "projections": [],
            }],
        )
        _, wrong_scope_payload = dispatch_post(
            self.database,
            "/api/query-groups",
            wrong_scope_request,
        )
        wrong_pin = {
            "fareId": fare["id"],
            "resourceKey": wrong_scope_payload["groups"][0]["manifest"]["resourceKey"],
        }
        wrong_lookup = {
            "version": 1,
            "requestId": "lookup-wrong-resource",
            "sourceVersion": self.source_version,
            "pins": [wrong_pin],
        }
        status, wrong_payload = dispatch_post(
            self.database,
            "/api/lookup",
            wrong_lookup,
        )
        self.assertEqual(status, HTTPStatus.OK)
        self.assertEqual(wrong_payload["items"], [])
        self.assertEqual(wrong_payload["missingPins"], [wrong_pin])

        correct_pin = {"fareId": fare["id"], "resourceKey": resource_key}
        mixed_lookup = {
            **wrong_lookup,
            "requestId": "lookup-mixed-resources",
            "pins": [correct_pin, wrong_pin],
        }
        status, mixed_payload = dispatch_post(
            self.database,
            "/api/lookup",
            mixed_lookup,
        )
        self.assertEqual(status, HTTPStatus.OK)
        self.assertEqual(mixed_payload["items"], [])
        self.assertEqual(mixed_payload["missingPins"], [correct_pin, wrong_pin])

        request["sourceVersion"] = "sqlite-demo-v2-stale"
        with self.assertRaises(QueryApiError) as raised:
            dispatch_post(self.database, "/api/lookup", request)
        self.assertEqual((raised.exception.status, raised.exception.code), (HTTPStatus.CONFLICT, "sourceChanged"))

    def test_strict_contract_rejects_unknown_fields_scope_injection_and_large_windows(self) -> None:
        cases = []
        unknown_projection = self.fare_page()
        unknown_projection["sql"] = "DROP TABLE fares"
        cases.append(self.request([unknown_projection]))
        cases.append(self.request([], groups=[{"groupId": "injected", "scope": self.scope(originId="london' OR 1=1 --"), "projections": []}]))
        cases.append(self.request([], groups=[{"groupId": "too-wide", "scope": self.scope(dateWindow={"from": "2026-01-01", "to": "2028-01-03"}, earliestDeparture={"date": "2026-01-01", "minutes": 0}), "projections": []}]))
        for request in cases:
            with self.subTest(request=request), self.assertRaises(QueryApiError) as raised:
                dispatch_post(self.database, "/api/query-groups", request)
            self.assertIn(raised.exception.code, {"invalidRequest", "unknownScope"})

        stale = self.request([], expectedSourceVersion="sqlite-demo-v2-stale")
        with self.assertRaises(QueryApiError) as raised:
            dispatch_post(self.database, "/api/query-groups", stale)
        self.assertEqual((raised.exception.status, raised.exception.code), (HTTPStatus.CONFLICT, "sourceChanged"))

        outside_scope = self.scope(
            dateWindow={"from": "2026-10-05", "to": "2026-10-05"},
            earliestDeparture={"date": "2026-10-05", "minutes": 0},
        )
        calendar = {
            "projectionId": "calendar",
            "kind": "calendarDays",
            "filters": self.filters(),
            "objective": "cheapest",
        }
        outside = self.request(
            [self.fare_page(), calendar],
            groups=[{"groupId": "outside", "scope": outside_scope, "projections": [self.fare_page(), calendar]}],
        )
        _, outside_payload = dispatch_post(self.database, "/api/query-groups", outside)
        outside_group = outside_payload["groups"][0]
        self.assertEqual(outside_group["manifest"]["availableDateWindow"], None)
        self.assertFalse(outside_group["manifest"]["complete"])
        self.assertEqual(outside_group["manifest"]["totalAvailable"], 0)
        self.assertEqual(outside_group["projections"][0]["items"], [])
        self.assertEqual(outside_group["projections"][1]["days"], [])

        partial_scope = self.scope(
            dateWindow={"from": "2026-10-01", "to": "2026-10-03"},
            earliestDeparture={"date": "2026-10-01", "minutes": 0},
        )
        partial = self.request(
            [self.fare_page(limit=100), calendar],
            groups=[{"groupId": "partial", "scope": partial_scope, "projections": [self.fare_page(limit=100), calendar]}],
        )
        _, partial_payload = dispatch_post(self.database, "/api/query-groups", partial)
        partial_group = partial_payload["groups"][0]
        self.assertEqual(partial_group["manifest"]["availableDateWindow"], {"from": "2026-10-02", "to": "2026-10-03"})
        self.assertFalse(partial_group["manifest"]["complete"])
        self.assertEqual(
            {fare["serviceDate"] for fare in partial_group["projections"][0]["items"]},
            {"2026-10-02", "2026-10-03"},
        )
        self.assertEqual(
            [day["date"] for day in partial_group["projections"][1]["days"]],
            ["2026-10-02", "2026-10-03"],
        )

    def test_filters_are_deterministic_and_direct_only_excludes_connections(self) -> None:
        all_page = self.execute([self.fare_page(limit=100)])["groups"][0]["projections"][0]
        self.assertTrue(any(not fare["direct"] for fare in all_page["items"]))
        selected = next(fare for fare in all_page["items"] if fare["direct"])
        filters = self.filters(
            modes=[selected["mode"]],
            carrierIds=[selected["carrierId"]],
            directOnly=True,
            maxPriceCents=selected["priceCents"],
            maxDurationMinutes=selected["durationMinutes"],
        )
        filtered = self.execute([self.fare_page(limit=100, filters=filters)])["groups"][0]["projections"][0]
        for fare in filtered["items"]:
            self.assertEqual(fare["mode"], selected["mode"])
            self.assertEqual(fare["carrierId"], selected["carrierId"])
            self.assertTrue(fare["direct"])
            self.assertLessEqual(fare["priceCents"], selected["priceCents"])
            self.assertLessEqual(fare["durationMinutes"], selected["durationMinutes"])
        self.assertIn(selected["id"], [fare["id"] for fare in filtered["items"]])
        direct_page = self.execute([self.fare_page(limit=100, filters=self.filters(directOnly=True))])["groups"][0]["projections"][0]
        self.assertTrue(all(fare["direct"] and len(fare["legs"]) == 1 for fare in direct_page["items"]))
        self.assertLess(direct_page["pageInfo"]["total"], all_page["pageInfo"]["total"])

    def test_connected_route_legs_and_direct_filter_follow_v4_source(self) -> None:
        projection = self.fare_page(limit=100, filters=self.filters(modes=["flight"]))
        payload = self.execute([projection])
        page = payload["groups"][0]["projections"][0]
        connected = [fare for fare in page["items"] if not fare["direct"]]
        self.assertTrue(connected)
        for fare in connected:
            self.assertGreater(len(fare["legs"]), 1)
            self.assert_fare_legs(fare)

        lookup_request = {
            "version": 1,
            "requestId": "connected-lookup",
            "sourceVersion": payload["sourceVersion"],
            "pins": [{
                "fareId": connected[0]["id"],
                "resourceKey": payload["groups"][0]["manifest"]["resourceKey"],
            }],
        }
        _, lookup = dispatch_post(self.database, "/api/lookup", lookup_request)
        self.assertEqual(lookup["items"][0]["legs"], connected[0]["legs"])

        direct_projection = self.fare_page(
            limit=100,
            filters=self.filters(modes=["flight"], directOnly=True),
        )
        direct_payload = self.execute([direct_projection])
        direct_page = direct_payload["groups"][0]["projections"][0]
        self.assertTrue(all(fare["direct"] and len(fare["legs"]) == 1 for fare in direct_page["items"]))
        self.assertLess(direct_page["pageInfo"]["total"], page["pageInfo"]["total"])

    def test_source_replacement_after_read_cannot_return_a_committable_batch(self) -> None:
        source = Path(self.temporary_directory.name) / "query-source-race.sqlite3"
        shutil.copy2(self.database, source)
        original = app_module.execute_query_groups

        def touch_after_read(*args: object, **kwargs: object) -> dict[str, object]:
            result = original(*args, **kwargs)
            stat = source.stat()
            os.utime(source, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
            return result

        with patch.object(app_module, "execute_query_groups", side_effect=touch_after_read):
            with self.assertRaises(QueryApiError) as raised:
                dispatch_post(source, "/api/query-groups", self.request([]))
        self.assertEqual((raised.exception.status, raised.exception.code), (HTTPStatus.CONFLICT, "sourceChanged"))

    def test_schedule_threshold_and_price_duration_filters_apply_server_side(self) -> None:
        scope = self.scope(earliestDeparture={"date": "2026-10-03", "minutes": 700})
        projection = self.fare_page(
            limit=100,
            filters=self.filters(minPriceCents=2_000, maxPriceCents=20_000, maxDurationMinutes=600),
        )
        request = self.request([projection], groups=[{"groupId": "threshold", "scope": scope, "projections": [projection]}])
        _, payload = dispatch_post(self.database, "/api/query-groups", request)
        items = payload["groups"][0]["projections"][0]["items"]
        self.assertTrue(items)
        for fare in items:
            self.assertGreaterEqual((fare["serviceDate"], fare["departureMinutes"]), ("2026-10-03", 700))
            self.assertGreaterEqual(fare["priceCents"], 2_000)
            self.assertLessEqual(fare["priceCents"], 20_000)
            self.assertLessEqual(fare["durationMinutes"], 600)

        calendar_request = self.request(
            [{"projectionId": "calendar", "kind": "calendarDays", "filters": self.filters(), "objective": "fastest"}],
            groups=[{
                "groupId": "threshold-calendar",
                "scope": scope,
                "projections": [{"projectionId": "calendar", "kind": "calendarDays", "filters": self.filters(), "objective": "fastest"}],
            }],
        )
        _, calendar_payload = dispatch_post(self.database, "/api/query-groups", calendar_request)
        days = calendar_payload["groups"][0]["projections"][0]["days"]
        self.assertEqual([day["date"] for day in days], ["2026-10-02", "2026-10-03", "2026-10-04"])
        self.assertEqual((days[0]["count"], days[0]["representative"]), (0, None))

        empty_calendar = {
            "projectionId": "empty-calendar",
            "kind": "calendarDays",
            "filters": self.filters(carrierIds=["carrier-does-not-exist"]),
            "objective": "cheapest",
        }
        empty_days = self.execute([empty_calendar])["groups"][0]["projections"][0]["days"]
        self.assertEqual([(day["count"], day["representative"]) for day in empty_days], [(0, None)] * 3)

    def test_concurrent_readers_return_one_source_version(self) -> None:
        request = self.request([self.fare_page(limit=5)])

        def execute(_: int) -> tuple[str, str, tuple[str, ...]]:
            _, payload = dispatch_post(self.database, "/api/query-groups", request)
            projection = payload["groups"][0]["projections"][0]
            return payload["sourceVersion"], projection["resultFingerprint"], tuple(item["id"] for item in projection["items"])

        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(execute, range(24)))
        self.assertEqual(len(set(results)), 1)

    def test_http_post_returns_versioned_errors_and_enforces_body_limit(self) -> None:
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.database))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{server.server_port}"
        try:
            body = json.dumps(self.request([self.fare_page(limit=1)])).encode()
            request = Request(base_url + "/api/query-groups", data=body, headers={"Content-Type": "application/json"}, method="POST")
            with urlopen(request, timeout=5) as response:
                payload = json.load(response)
            self.assertEqual(payload["requestId"], "request-1")
            self.assertEqual(response.status, HTTPStatus.OK)

            oversized = b"{" + b" " * MAX_REQUEST_BODY_BYTES
            request = Request(base_url + "/api/query-groups", data=oversized, headers={"Content-Type": "application/json"}, method="POST")
            with self.assertRaises(HTTPError) as raised:
                urlopen(request, timeout=5)
            payload = json.load(raised.exception)
            self.assertEqual(raised.exception.code, HTTPStatus.BAD_REQUEST)
            self.assertEqual(payload["error"]["code"], "invalidRequest")
            self.assertEqual(payload["version"], 1)

            stale_body = json.dumps(self.request([], expectedSourceVersion="sqlite-demo-v2-stale")).encode()
            request = Request(base_url + "/api/query-groups", data=stale_body, headers={"Content-Type": "application/json"}, method="POST")
            with self.assertRaises(HTTPError) as raised:
                urlopen(request, timeout=5)
            payload = json.load(raised.exception)
            self.assertEqual(raised.exception.code, HTTPStatus.CONFLICT)
            self.assertEqual(payload, {
                "version": 1,
                "requestId": "request-1",
                "error": {"code": "sourceChanged", "message": "The fare source changed. Refresh the displayed results."},
            })
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
