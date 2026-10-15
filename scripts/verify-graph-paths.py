#!/usr/bin/env python3
"""Validate and optionally repair portable Graphify source paths."""

from __future__ import annotations

import argparse
import copy
import json
import os
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class VerificationError(Exception):
    """Raised when graph provenance cannot be made portable."""


@dataclass
class Stats:
    nodes: int = 0
    manifest_files: int = 0
    local_sources: int = 0
    normalized: int = 0
    externalized: int = 0


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise VerificationError(f"cannot read {path}: {error}") from error


def local_file(repo: Path, value: str) -> Path | None:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        return None
    candidate = (repo / path).resolve()
    try:
        candidate.relative_to(repo)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def dependency_names(repo: Path) -> set[str]:
    package_path = repo / "package.json"
    if not package_path.is_file():
        return set()
    package = read_json(package_path)
    if not isinstance(package, dict):
        raise VerificationError("package.json must contain an object")
    names: set[str] = set()
    for field in ("dependencies", "devDependencies"):
        values = package.get(field, {})
        if not isinstance(values, dict):
            raise VerificationError(f"package.json {field} must contain an object")
        names.update(name for name in values if isinstance(name, str))
    return names


def repaired_graph(repo: Path, graph: Any) -> tuple[dict[str, Any], Stats, list[str]]:
    if not isinstance(graph, dict) or not isinstance(graph.get("nodes"), list):
        raise VerificationError("graph.json must contain a nodes array")

    candidate_graph = copy.deepcopy(graph)
    nodes = candidate_graph["nodes"]
    dependencies = dependency_names(repo)
    stats = Stats(nodes=len(nodes))
    errors: list[str] = []

    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"node {index} is not an object")
            continue
        source = node.get("source_file")
        if source in (None, ""):
            continue
        node_name = repr(node.get("id", index))
        if not isinstance(source, str):
            errors.append(f"node {node_name} has a non-string source_file")
            continue

        if local_file(repo, source) is not None:
            stats.local_sources += 1
            continue

        label = node.get("label")
        source_path = Path(source)
        if (
            source == source_path.name
            and isinstance(label, str)
            and label.startswith("/src/")
        ):
            label_path = label.lstrip("/")
            label_file = local_file(repo, label_path)
            if label_file is not None and source == Path(label_path).name:
                node["source_file"] = label_file.relative_to(repo).as_posix()
                stats.local_sources += 1
                stats.normalized += 1
                continue

        if source in dependencies and label == source:
            node["source_module"] = source
            del node["source_file"]
            stats.externalized += 1
            continue

        kind = "absolute" if source_path.is_absolute() else "missing or non-portable"
        errors.append(f"node {node_name} has {kind} source_file {source!r}")

    if stats.local_sources == 0:
        errors.append("graph has no local source corpus")
    return candidate_graph, stats, errors


def validate_manifest(repo: Path, manifest: Any) -> tuple[int, list[str]]:
    if not isinstance(manifest, dict) or not manifest:
        return 0, ["manifest.json must contain at least one file"]
    errors: list[str] = []
    for key in manifest:
        if not isinstance(key, str) or not key:
            errors.append(f"manifest key {key!r} is not a nonempty path")
            continue
        if local_file(repo, key) is None:
            kind = "absolute" if Path(key).is_absolute() else "missing or non-portable"
            errors.append(f"manifest has {kind} path {key!r}")
    return len(manifest), errors


def atomic_write_json(path: Path, value: Any) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(value, stream, indent=2, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def verify(repo: Path, repair: bool) -> Stats:
    repo = repo.resolve()
    graph_path = repo / "graphify-out" / "graph.json"
    manifest_path = repo / "graphify-out" / "manifest.json"
    graph = read_json(graph_path)
    manifest = read_json(manifest_path)

    candidate_graph, stats, errors = repaired_graph(repo, graph)
    stats.manifest_files, manifest_errors = validate_manifest(repo, manifest)
    errors.extend(manifest_errors)
    if errors:
        raise VerificationError("\n".join(errors))

    repairs = stats.normalized + stats.externalized
    if repairs and not repair:
        raise VerificationError(
            f"graph needs repair: normalized={stats.normalized} "
            f"externalized={stats.externalized}; rerun with --repair"
        )
    if repair and repairs:
        atomic_write_json(graph_path, candidate_graph)
    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (defaults to the parent of this script's directory)",
    )
    parser.add_argument(
        "--repair",
        action="store_true",
        help="normalize recognized parser provenance before validating",
    )
    return parser.parse_args()


def main() -> int:
    arguments = parse_args()
    try:
        stats = verify(arguments.repo, arguments.repair)
    except VerificationError as error:
        print(f"Graph path verification failed:\n{error}", file=sys.stderr)
        return 1
    print(
        "Graph paths valid: "
        f"normalized={stats.normalized} externalized={stats.externalized} "
        f"nodes={stats.nodes} manifest={stats.manifest_files} "
        f"local_sources={stats.local_sources}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
