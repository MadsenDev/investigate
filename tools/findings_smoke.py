#!/usr/bin/env python3
"""Smoke-test Vitni 2 findings against the checked-in showcase case.

This intentionally uses Python's stdlib sqlite3 so CI can validate the case seed
and migration without loading Electron's native better-sqlite3 build in Node.
"""

from __future__ import annotations

import json
import sqlite3
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "samples/operation-glass-harbor.vitni/db/case.sqlite.sql"
MIGRATION = ROOT / "db/migrations/007_add_findings.sql"


def build_bundle(connection: sqlite3.Connection) -> dict:
    connection.row_factory = sqlite3.Row
    findings = connection.execute(
        "SELECT id, title, body, status, created_at, updated_at "
        "FROM finding WHERE status = 'reviewed' ORDER BY updated_at DESC, id ASC"
    ).fetchall()

    output_findings = []
    source_ids: set[str] = set()
    for finding in findings:
        assertions = connection.execute(
            """
            SELECT a.id, a.subject_kind, a.subject_id, a.path, a.value_json,
                   a.source_id, a.confidence, a.review_state,
                   s.id AS resolved_source_id, s.kind AS source_kind,
                   s.locator AS source_locator, s.title AS source_title,
                   s.hash AS source_hash
            FROM finding_assertion fa
            JOIN assertion a ON a.id = fa.assertion_id
            LEFT JOIN source s ON s.id = a.source_id
            WHERE fa.finding_id = ?
            ORDER BY fa.position ASC, a.id ASC
            """,
            (finding["id"],),
        ).fetchall()
        if not assertions:
            raise AssertionError("Reviewed finding has no supporting assertions")

        serialized_assertions = []
        for assertion in assertions:
            if assertion["review_state"] != "accepted":
                raise AssertionError("Reviewed finding includes a non-accepted assertion")
            if not assertion["resolved_source_id"]:
                raise AssertionError("Reviewed finding includes unresolved evidence")
            source_ids.add(assertion["source_id"])
            serialized_assertions.append(
                {
                    "id": assertion["id"],
                    "subject_kind": assertion["subject_kind"],
                    "subject_id": assertion["subject_id"],
                    "path": assertion["path"],
                    "value": json.loads(assertion["value_json"] or "{}"),
                    "source_id": assertion["source_id"],
                    "confidence": assertion["confidence"],
                    "review_state": assertion["review_state"],
                    "source": {
                        "id": assertion["resolved_source_id"],
                        "kind": assertion["source_kind"],
                        "locator": assertion["source_locator"],
                        "title": assertion["source_title"],
                        "hash": assertion["source_hash"],
                    },
                }
            )

        output_findings.append(
            {
                "id": finding["id"],
                "title": finding["title"],
                "body": finding["body"],
                "status": finding["status"],
                "assertions": serialized_assertions,
            }
        )

    sources = []
    for source_id in sorted(source_ids):
        row = connection.execute(
            "SELECT id, kind, locator, title, hash FROM source WHERE id = ?",
            (source_id,),
        ).fetchone()
        if row is None:
            raise AssertionError(f"Source disappeared during export: {source_id}")
        sources.append(dict(row))

    return {
        "format": "vitni-findings-evidence-v1",
        "findings": output_findings,
        "sources": sources,
    }


def main() -> None:
    seed_sql = SEED.read_text(encoding="utf-8")
    migration_sql = MIGRATION.read_text(encoding="utf-8")

    with tempfile.TemporaryDirectory(prefix="vitni-findings-") as temp_dir:
        database_path = Path(temp_dir) / "glass-harbor.sqlite"
        connection = sqlite3.connect(database_path)
        try:
            connection.executescript(seed_sql)
            connection.executescript(migration_sql)

            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                ).fetchall()
            }
            assert {"finding", "finding_assertion"}.issubset(tables)

            assertion = connection.execute(
                """
                SELECT a.id, a.source_id
                FROM assertion a
                JOIN source s ON s.id = a.source_id
                ORDER BY a.created_at ASC, a.id ASC
                LIMIT 1
                """
            ).fetchone()
            if assertion is None:
                raise AssertionError("Showcase case contains no sourced assertion")

            assertion_id, source_id = assertion
            connection.execute(
                "UPDATE assertion SET review_state = 'accepted', reviewed_by = 'CI smoke', reviewed_at = ? WHERE id = ?",
                (1775001600, assertion_id),
            )
            connection.execute(
                "INSERT INTO finding (id, title, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (
                    "finding-smoke-1",
                    "Showcase evidence chain survives migration",
                    "A synthetic conclusion used only to validate finding provenance.",
                    "reviewed",
                    1775001600,
                    1775001600,
                ),
            )
            connection.execute(
                "INSERT INTO finding_assertion (finding_id, assertion_id, position) VALUES (?, ?, ?)",
                ("finding-smoke-1", assertion_id, 0),
            )
            connection.commit()

            bundle = build_bundle(connection)
            assert bundle["format"] == "vitni-findings-evidence-v1"
            assert len(bundle["findings"]) == 1
            assert bundle["findings"][0]["assertions"][0]["id"] == assertion_id
            assert bundle["findings"][0]["assertions"][0]["source_id"] == source_id
            assert len(bundle["sources"]) == 1
            assert bundle["sources"][0]["id"] == source_id

            first = json.dumps(bundle, sort_keys=True, separators=(",", ":"))
            second = json.dumps(build_bundle(connection), sort_keys=True, separators=(",", ":"))
            assert first == second, "Provenance serialization changed without case mutation"

            print(
                "Vitni findings smoke passed: migration 007 + reviewed finding + assertion/source provenance"
            )
        finally:
            connection.close()


if __name__ == "__main__":
    main()
