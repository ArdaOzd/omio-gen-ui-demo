from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "verify-graph-paths.py"


class VerifyGraphPathsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.repo = Path(self.temporary.name)
        (self.repo / "graphify-out").mkdir()
        (self.repo / "src").mkdir()
        (self.repo / "src" / "local.ts").write_text("export const local = true\n")
        (self.repo / "package.json").write_text(
            json.dumps(
                {
                    "dependencies": {"zod": "1.0.0"},
                    "devDependencies": {"vitest": "1.0.0"},
                }
            )
        )
        self.write_manifest({"src/local.ts": {"ast_hash": "fixture"}})

    def tearDown(self) -> None:
        self.temporary.cleanup()

    @property
    def graph_path(self) -> Path:
        return self.repo / "graphify-out" / "graph.json"

    def write_graph(self, nodes: list[dict[str, object]]) -> None:
        self.graph_path.write_text(
            json.dumps(
                {
                    "directed": False,
                    "nodes": nodes,
                    "links": [{"source": "one", "target": "two"}],
                    "custom": {"preserved": True},
                },
                indent=2,
            )
            + "\n"
        )

    def write_manifest(self, manifest: dict[str, object]) -> None:
        (self.repo / "graphify-out" / "manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n"
        )

    def run_script(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--repo", str(self.repo), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_valid_graph_is_unchanged_and_repair_is_idempotent(self) -> None:
        self.write_graph(
            [{"id": "one", "label": "local", "source_file": "src/local.ts"}]
        )
        original = self.graph_path.read_bytes()

        validation = self.run_script()
        repair = self.run_script("--repair")

        self.assertEqual(validation.returncode, 0, validation.stderr)
        self.assertEqual(repair.returncode, 0, repair.stderr)
        self.assertIn("normalized=0 externalized=0", repair.stdout)
        self.assertEqual(self.graph_path.read_bytes(), original)

    def test_declared_dependency_moves_to_external_provenance(self) -> None:
        self.write_graph(
            [
                {"id": "one", "label": "local", "source_file": "src/local.ts"},
                {
                    "id": "zod_zod",
                    "label": "zod",
                    "source_file": "zod",
                    "confidence": "EXTRACTED",
                },
            ]
        )

        validation = self.run_script()
        repair = self.run_script("--repair")
        repaired_bytes = self.graph_path.read_bytes()
        second_repair = self.run_script("--repair")
        graph = json.loads(self.graph_path.read_text())

        self.assertEqual(validation.returncode, 1)
        self.assertIn("externalized=1", validation.stderr)
        self.assertEqual(repair.returncode, 0, repair.stderr)
        self.assertIn("externalized=1", repair.stdout)
        self.assertEqual(graph["nodes"][1]["source_module"], "zod")
        self.assertNotIn("source_file", graph["nodes"][1])
        self.assertEqual(graph["nodes"][1]["confidence"], "EXTRACTED")
        self.assertEqual(graph["links"], [{"source": "one", "target": "two"}])
        self.assertEqual(second_repair.returncode, 0, second_repair.stderr)
        self.assertIn("normalized=0 externalized=0", second_repair.stdout)
        self.assertEqual(self.graph_path.read_bytes(), repaired_bytes)

    def test_browser_root_label_repairs_only_a_bare_basename(self) -> None:
        source = self.repo / "src" / "generative" / "data" / "fare-data-bridge.ts"
        source.parent.mkdir(parents=True)
        source.write_text("export const bridge = true\n")
        self.write_graph(
            [
                {"id": "one", "label": "local", "source_file": "src/local.ts"},
                {
                    "id": "bridge",
                    "label": "/src/generative/data/fare-data-bridge.ts",
                    "source_file": "fare-data-bridge.ts",
                    "other": ["preserved"],
                },
            ]
        )

        result = self.run_script("--repair")
        graph = json.loads(self.graph_path.read_text())

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("normalized=1", result.stdout)
        self.assertEqual(
            graph["nodes"][1]["source_file"],
            "src/generative/data/fare-data-bridge.ts",
        )
        self.assertEqual(graph["nodes"][1]["other"], ["preserved"])

    def test_missing_and_absolute_sources_fail_without_partial_repair(self) -> None:
        absolute = (self.repo / "src" / "local.ts").resolve()
        cases = (
            {"id": "missing", "label": "unknown", "source_file": "missing.ts"},
            {"id": "absolute", "label": "local", "source_file": str(absolute)},
            {
                "id": "traversal",
                "label": "/src/generative/data/fare-data-bridge.ts",
                "source_file": "../fare-data-bridge.ts",
            },
        )
        for invalid in cases:
            with self.subTest(source=invalid["source_file"]):
                self.write_graph(
                    [
                        {
                            "id": "repairable",
                            "label": "zod",
                            "source_file": "zod",
                        },
                        {"id": "one", "label": "local", "source_file": "src/local.ts"},
                        invalid,
                    ]
                )
                original = self.graph_path.read_bytes()

                result = self.run_script("--repair")

                self.assertEqual(result.returncode, 1)
                self.assertIn("Graph path verification failed", result.stderr)
                self.assertEqual(self.graph_path.read_bytes(), original)

    def test_invalid_manifest_path_prevents_partial_graph_repair(self) -> None:
        self.write_graph(
            [
                {"id": "one", "label": "local", "source_file": "src/local.ts"},
                {"id": "repairable", "label": "zod", "source_file": "zod"},
            ]
        )
        self.write_manifest({"src/../src/local.ts": {"ast_hash": "fixture"}})
        original = self.graph_path.read_bytes()

        result = self.run_script("--repair")

        self.assertEqual(result.returncode, 1)
        self.assertIn("manifest has missing or non-portable path", result.stderr)
        self.assertEqual(self.graph_path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
