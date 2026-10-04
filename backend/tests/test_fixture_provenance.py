from __future__ import annotations
import sqlite3
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from backend.generate_db import directional_routes,generate_database
from backend.seeds import SOURCE_DESTINATION_SLUGS
from backend.verify_db import verify_database

class FixtureProvenanceTests(unittest.TestCase):
 def setUp(self):
  self.directory=tempfile.TemporaryDirectory();self.addCleanup(self.directory.cleanup)
  self.database=Path(self.directory.name)/'preserved.sqlite3';self.rows=len(directional_routes())*2
  generate_database(self.database,row_count=self.rows,start_date=date(2026,10,2),end_date=date(2026,10,3),seed=42)
  with sqlite3.connect(self.database) as c:
   c.execute("UPDATE metadata SET value='2' WHERE key='generator_version'")
   c.execute("INSERT INTO metadata(key,value) VALUES('dataset_type','synthetic_demo')")
 def test_current_profile_remains_strict_and_preserved_profile_reports_exact_declared_drift(self):
  stat=self.database.stat()
  with patch('backend.verify_db.SOURCE_DESTINATION_SLUGS',(*SOURCE_DESTINATION_SLUGS,'future-destination')):
   with self.assertRaisesRegex(RuntimeError,'source destinations'):verify_database(self.database,expected_rows=self.rows)
   report=verify_database(self.database,expected_rows=self.rows,manifest_policy='preserved-v2')
  self.assertEqual(report['source_manifest_status'],'drift')
  self.assertEqual(report['source_manifest_drift']['missing_destinations'],['future-destination'])
  self.assertEqual(report['source_manifest_drift']['missing_mode_routes'],[])
  self.assertEqual(report['verification_profile'],'preserved-v2')
  self.assertEqual(report['generator_version'],'2')
  self.assertEqual(report['source_version'],f'sqlite-demo-v2-{stat.st_ino:x}-{stat.st_size:x}-{stat.st_mtime_ns:x}')
  self.assertEqual((self.database.stat().st_size,self.database.stat().st_mtime_ns),(stat.st_size,stat.st_mtime_ns))
 def test_preserved_profile_cannot_hide_invalid_facts(self):
  with sqlite3.connect(self.database) as c:
   c.execute('PRAGMA ignore_check_constraints=ON');c.execute('UPDATE fares SET price_cents=-1 WHERE id=(SELECT MIN(id) FROM fares)')
  with self.assertRaisesRegex(RuntimeError,'invalid fares'):verify_database(self.database,expected_rows=self.rows,manifest_policy='preserved-v2')
 def test_preserved_profile_cannot_hide_row_count_or_index_failures(self):
  with self.assertRaisesRegex(RuntimeError,'expected'):verify_database(self.database,expected_rows=self.rows+1,manifest_policy='preserved-v2')
  with sqlite3.connect(self.database) as c:c.execute('DROP INDEX idx_fares_company')
  with self.assertRaisesRegex(RuntimeError,'indexes'):verify_database(self.database,expected_rows=self.rows,manifest_policy='preserved-v2')
 def test_preserved_profile_rejects_unknown_generator_or_non_demo_metadata(self):
  with sqlite3.connect(self.database) as c:c.execute("UPDATE metadata SET value='unknown' WHERE key='generator_version'")
  with self.assertRaisesRegex(RuntimeError,'generator'):verify_database(self.database,expected_rows=self.rows,manifest_policy='preserved-v2')
  with sqlite3.connect(self.database) as c:
   c.execute("UPDATE metadata SET value='2' WHERE key='generator_version'");c.execute("UPDATE metadata SET value='live' WHERE key='dataset_type'")
  with self.assertRaisesRegex(RuntimeError,'synthetic'):verify_database(self.database,expected_rows=self.rows,manifest_policy='preserved-v2')

if __name__=='__main__':unittest.main()
