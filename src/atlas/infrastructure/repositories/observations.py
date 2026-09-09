"""SQLite repository for confirmed observations and installed assets."""

from __future__ import annotations

import hashlib
import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from atlas.domain.confidence import calculate_confidence
from atlas.domain.duplicates import DuplicateAssessment
from atlas.domain.equipment import InstalledAsset, normalized_key
from atlas.domain.observations import Customer, EvidenceKind, ObservationRecord
from atlas.infrastructure.audit.ledger import append_audit_event, canonical_json
from atlas.infrastructure.database.sqlite import SQLiteDatabase


def _utc_iso() -> str:
    return datetime.now(UTC).isoformat()


def _row_to_asset(row: sqlite3.Row) -> InstalledAsset:
    return InstalledAsset(
        id=row["id"],
        customer_id=row["customer_id"],
        modality=row["modality"],
        quantity=row["quantity"],
        brand=row["brand"],
        model=row["model"],
        serial_number=row["serial_number"],
        age_years=row["age_years"],
        installation_year=row["installation_year"],
        status=row["status"],
        confidence=row["confidence"],
        first_seen=row["first_seen"],
        last_seen=row["last_seen"],
        independent_confirmations=row["independent_confirmations"],
        notes=row["notes"],
    )


class ObservationRepository:
    def __init__(self, database: SQLiteDatabase) -> None:
        self.database = database

    def upsert_customer(self, connection: sqlite3.Connection, customer: Customer) -> str:
        key = "|".join(
            normalized_key(part) for part in (customer.name, customer.city, customer.country)
        )
        existing = connection.execute(
            "SELECT id FROM customers WHERE normalized_key = ?", (key,)
        ).fetchone()
        if existing:
            return str(existing["id"])
        now = _utc_iso()
        connection.execute(
            """
            INSERT INTO customers
                (id, name, city, country, normalized_key, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (customer.id, customer.name, customer.city, customer.country, key, now, now),
        )
        return customer.id

    def save_confirmed(self, record: ObservationRecord, *, actor: str) -> list[str]:
        if not record.ready_for_review:
            raise ValueError("Observation needs customer, location, and equipment")
        customer = Customer(name=record.client, city=record.city, country=record.country)
        asset_ids: list[str] = []
        with self.database.transaction() as connection:
            customer_id = self.upsert_customer(connection, customer)
            connection.execute(
                """
                INSERT INTO observations
                    (id, customer_id, observer, visit_date, raw_text, source, status,
                     confidence_score, version, created_at, confirmed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    customer_id,
                    record.observer,
                    record.visit_date.isoformat(),
                    record.raw_text,
                    record.source.value,
                    record.status.value,
                    record.confidence_score,
                    record.version,
                    record.created_at.isoformat(),
                    record.confirmed_at.isoformat() if record.confirmed_at else None,
                ),
            )

            has_photo = any(item.kind == EvidenceKind.PHOTO for item in record.evidence)
            for equipment in record.equipment:
                confidence = calculate_confidence(
                    equipment,
                    record.visit_date,
                    has_photo=has_photo,
                    has_voice_or_text=bool(record.raw_text),
                )
                equipment.confidence = confidence.total
                asset_ids.append(equipment.id)
                now = _utc_iso()
                connection.execute(
                    """
                    INSERT INTO assets
                        (id, customer_id, modality, quantity, brand, model, serial_number,
                         age_years, installation_year, status, confidence, first_seen,
                         last_seen, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        equipment.id,
                        customer_id,
                        equipment.modality,
                        equipment.quantity,
                        equipment.brand,
                        equipment.model,
                        equipment.serial_number,
                        equipment.age_years,
                        equipment.resolved_installation_year(record.visit_date),
                        equipment.status.value,
                        confidence.total,
                        record.visit_date.isoformat(),
                        record.visit_date.isoformat(),
                        equipment.notes,
                        now,
                        now,
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO asset_observations
                        (asset_id, observation_id, evidence_text, field_values_json)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        equipment.id,
                        record.id,
                        equipment.evidence_text,
                        canonical_json(equipment.model_dump(mode="json")),
                    ),
                )

            for evidence in record.evidence:
                connection.execute(
                    """
                    INSERT INTO evidence
                        (id, observation_id, kind, local_path, sha256, excerpt, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        evidence.id,
                        record.id,
                        evidence.kind.value,
                        str(evidence.local_path) if evidence.local_path else None,
                        evidence.sha256,
                        evidence.excerpt,
                        _utc_iso(),
                    ),
                )

            payload = record.model_dump(mode="json")
            append_audit_event(
                connection,
                entity_type="observation",
                entity_id=record.id,
                action="confirmed",
                actor=actor,
                payload=payload,
            )
            payload_json = canonical_json(payload)
            payload_hash = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
            connection.execute(
                """
                INSERT OR IGNORE INTO sync_outbox
                    (id, event_type, entity_id, payload_json, payload_hash,
                     state, attempts, created_at, updated_at)
                VALUES (?, 'observation.confirmed', ?, ?, ?, 'Pending', 0, ?, ?)
                """,
                (str(uuid4()), record.id, payload_json, payload_hash, _utc_iso(), _utc_iso()),
            )
        return asset_ids

    def find_customer_id(self, name: str, city: str, country: str) -> str | None:
        key = "|".join(normalized_key(part) for part in (name, city, country))
        with self.database.connect() as connection:
            row = connection.execute(
                "SELECT id FROM customers WHERE normalized_key = ?", (key,)
            ).fetchone()
        return str(row["id"]) if row else None

    def save_duplicate_candidate(
        self,
        incoming_asset_id: str,
        existing_asset_id: str,
        assessment: DuplicateAssessment,
    ) -> None:
        with self.database.transaction() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO duplicate_candidates
                    (id, incoming_asset_id, existing_asset_id, score, reasons_json,
                     conflicts_json, review_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
                """,
                (
                    str(uuid4()),
                    incoming_asset_id,
                    existing_asset_id,
                    assessment.score,
                    canonical_json(assessment.reasons),
                    canonical_json(assessment.conflicts),
                    _utc_iso(),
                ),
            )

    def list_assets(self, customer_id: str | None = None) -> list[InstalledAsset]:
        with self.database.connect() as connection:
            if customer_id:
                rows = connection.execute(
                    "SELECT * FROM assets WHERE customer_id = ? ORDER BY last_seen DESC",
                    (customer_id,),
                ).fetchall()
            else:
                rows = connection.execute("SELECT * FROM assets ORDER BY last_seen DESC").fetchall()
        return [_row_to_asset(row) for row in rows]

    def customer_summary(self) -> list[dict[str, object]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                """
                SELECT c.id, c.name, c.city, c.country,
                       COUNT(a.id) AS asset_records,
                       COALESCE(SUM(a.quantity), 0) AS reported_units,
                       ROUND(COALESCE(AVG(a.confidence), 0), 3) AS average_confidence,
                       MAX(a.last_seen) AS last_observed
                FROM customers AS c
                LEFT JOIN assets AS a ON a.customer_id = c.id
                GROUP BY c.id
                ORDER BY c.country, c.city, c.name
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def raw_query(self, sql: str, values: list[object]) -> list[dict[str, object]]:
        if not sql.lstrip().upper().startswith("SELECT"):
            raise ValueError("Only SELECT inventory queries are allowed")
        with self.database.connect() as connection:
            return [dict(row) for row in connection.execute(sql, values).fetchall()]
