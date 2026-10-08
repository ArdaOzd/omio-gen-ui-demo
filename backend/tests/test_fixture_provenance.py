from __future__ import annotations

import sqlite3
import tempfile
import unittest
from datetime import date
from pathlib import Path

from backend.generate_db import directional_routes, generate_database
from backend.verify_db import (
    EXPECTED_COVERAGE_MODEL,
    EXPECTED_LOCATION_SCOPE,
    EXPECTED_SCHEMA_VERSION,
    verify_database,
)


FIXTURE_DATE = date(2026, 10, 8)


class VerifierContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.database = Path(self.directory.name) / "current.sqlite3"
        self.rows = len(directional_routes())
        generate_database(
            self.database,
            row_count=self.rows,
            start_date=FIXTURE_DATE,
            end_date=FIXTURE_DATE,
            seed=42,
        )

    def test_verifier_reports_current_contract_without_modifying_the_database(self) -> None:
        stat = self.database.stat()
        report = verify_database(
            self.database,
            expected_rows=self.rows,
            expected_start_date=FIXTURE_DATE,
            expected_end_date=FIXTURE_DATE,
        )
        self.assertEqual(report["source_manifest_status"], "current")
        self.assertEqual(report["source_manifest_drift"]["missing_destinations"], [])
        self.assertEqual(report["coverage_model"], EXPECTED_COVERAGE_MODEL)
        self.assertEqual(report["location_scope"], EXPECTED_LOCATION_SCOPE)
        self.assertEqual(report["schema_version"], int(EXPECTED_SCHEMA_VERSION))
        self.assertEqual(report["service_day_count"], 1)
        self.assertEqual(report["route_day_count"], self.rows)
        self.assertEqual(report["feasible_route_day_count"], self.rows)
        self.assertEqual(
            (self.database.stat().st_size, self.database.stat().st_mtime_ns),
            (stat.st_size, stat.st_mtime_ns),
        )

    def test_verifier_rejects_invalid_facts(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.execute("PRAGMA ignore_check_constraints=ON")
            connection.execute(
                "UPDATE fares SET price_cents=-1 WHERE id=(SELECT MIN(id) FROM fares)"
            )
        with self.assertRaisesRegex(RuntimeError, "invalid fares"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )

    def test_verifier_rejects_row_count_and_index_failures(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "expected"):
            verify_database(
                self.database,
                expected_rows=self.rows + 1,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )
        with sqlite3.connect(self.database) as connection:
            connection.execute("DROP INDEX idx_fares_company")
        with self.assertRaisesRegex(RuntimeError, "indexes"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )

    def test_verifier_rejects_stale_coverage_metadata(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                "UPDATE metadata SET value='route_daily' WHERE key='coverage_model'"
            )
        with self.assertRaisesRegex(RuntimeError, "coverage_model"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )

    def test_verifier_rejects_per_mode_fare_count_drift(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                """
                UPDATE metadata
                SET value=CAST(CAST(value AS INTEGER) + 1 AS TEXT)
                WHERE key='fare_count_bus'
                """
            )
        with self.assertRaisesRegex(RuntimeError, "per-mode fare_count metadata"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )

    def test_verifier_rejects_location_manifest_drift(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                "UPDATE locations SET city='Wrong city' WHERE slug='london'"
            )
        with self.assertRaisesRegex(RuntimeError, "strict-Europe seed manifest"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )

    def test_verifier_rejects_a_sold_out_route_day(self) -> None:
        with sqlite3.connect(self.database) as connection:
            connection.execute(
                """
                UPDATE fares SET available_seats=0
                WHERE route_id=(SELECT MIN(route_id) FROM fares)
                  AND service_date=(SELECT MIN(service_date) FROM fares)
                """
            )
        with self.assertRaisesRegex(RuntimeError, "route-days"):
            verify_database(
                self.database,
                expected_rows=self.rows,
                expected_start_date=FIXTURE_DATE,
                expected_end_date=FIXTURE_DATE,
            )


if __name__ == "__main__":
    unittest.main()
