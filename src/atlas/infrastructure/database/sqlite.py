"""SQLite connection, schema, and deterministic demo-data import."""

from __future__ import annotations

import csv
import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from atlas.domain.equipment import normalized_key

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "local" / "atlas.db"
DEFAULT_SEED_PATH = PROJECT_ROOT / "data" / "seed" / "installed-base.csv"

SCHEMA = """
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    normalized_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    observer TEXT,
    visit_date TEXT NOT NULL,
    raw_text TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    confidence_score REAL NOT NULL CHECK(confidence_score BETWEEN 0 AND 1),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    confirmed_at TEXT
);

CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    modality TEXT,
    quantity INTEGER CHECK(quantity IS NULL OR quantity > 0),
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    age_years REAL CHECK(age_years IS NULL OR age_years >= 0),
    installation_year INTEGER,
    status TEXT NOT NULL,
    confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    independent_confirmations INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_observations (
    asset_id TEXT NOT NULL REFERENCES assets(id),
    observation_id TEXT NOT NULL REFERENCES observations(id),
    evidence_text TEXT,
    field_values_json TEXT NOT NULL,
    PRIMARY KEY (asset_id, observation_id)
);

CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    observation_id TEXT NOT NULL REFERENCES observations(id),
    kind TEXT NOT NULL,
    local_path TEXT,
    sha256 TEXT,
    excerpt TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id TEXT PRIMARY KEY,
    incoming_asset_id TEXT NOT NULL REFERENCES assets(id),
    existing_asset_id TEXT NOT NULL REFERENCES assets(id),
    score REAL NOT NULL CHECK(score BETWEEN 0 AND 1),
    reasons_json TEXT NOT NULL,
    conflicts_json TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL,
    UNIQUE(incoming_asset_id, existing_asset_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT,
    payload_json TEXT NOT NULL,
    previous_hash TEXT,
    event_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    payload_hash TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL DEFAULT 'Pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_customer ON assets(customer_id);
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_last_seen ON assets(last_seen);
CREATE INDEX IF NOT EXISTS idx_observations_customer ON observations(customer_id);
"""

CONFIDENCE_MAP = {"High": 0.9, "Medium": 0.65, "Low": 0.4}
STATUS_MAP = {
    "Confirmed": "Confirmado",
    "Reported": "Reportado",
    "Estimated": "Estimado",
    "Unknown": "Desconocido",
}


def utc_iso() -> str:
    return datetime.now(UTC).isoformat()


class SQLiteDatabase:
    def __init__(self, path: str | Path = DEFAULT_DB_PATH) -> None:
        self.path = Path(path)

    def connect(self) -> sqlite3.Connection:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        return connection

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def seed_from_csv(self, path: str | Path = DEFAULT_SEED_PATH) -> dict[str, int]:
        """Import the sponsor dataset without inventing or coercing unknown values."""

        seed_path = Path(path)
        counts = {"customers": 0, "observations": 0, "assets": 0}
        with seed_path.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))

        now = utc_iso()
        with self.transaction() as connection:
            for row in rows:
                customer_key = "|".join(
                    [
                        normalized_key(row["customer_hospital"]),
                        normalized_key(row["city"]),
                        normalized_key(row["country"]),
                    ]
                )
                customer_id = str(uuid5(NAMESPACE_URL, f"atlas:customer:{customer_key}"))
                before = connection.total_changes
                connection.execute(
                    """
                    INSERT OR IGNORE INTO customers
                        (id, name, city, country, normalized_key, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        customer_id,
                        row["customer_hospital"],
                        row["city"],
                        row["country"],
                        customer_key,
                        now,
                        now,
                    ),
                )
                counts["customers"] += connection.total_changes - before

                observation_id = f"seed-{row['observation_id']}"
                confidence = CONFIDENCE_MAP.get(row["confidence"], 0.3)
                before = connection.total_changes
                connection.execute(
                    """
                    INSERT OR IGNORE INTO observations
                        (id, customer_id, observer, visit_date, raw_text, source, status,
                         confidence_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        observation_id,
                        customer_id,
                        row["observer"] or None,
                        row["visit_date"],
                        row["voice_input_example"] or "",
                        row["source"],
                        STATUS_MAP.get(row["status"], "Desconocido"),
                        confidence,
                        now,
                    ),
                )
                counts["observations"] += connection.total_changes - before

                asset_id = str(uuid5(NAMESPACE_URL, f"atlas:seed-asset:{row['observation_id']}"))
                quantity = int(row["quantity"]) if row["quantity"] else None
                age = float(row["approx_age_years"]) if row["approx_age_years"] else None
                install_year = (
                    int(row["estimated_installation_year"])
                    if row["estimated_installation_year"]
                    else None
                )
                before = connection.total_changes
                connection.execute(
                    """
                    INSERT OR IGNORE INTO assets
                        (id, customer_id, modality, quantity, brand, model, serial_number,
                         age_years, installation_year, status, confidence, first_seen,
                         last_seen, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        asset_id,
                        customer_id,
                        row["modality"] or None,
                        quantity,
                        row["brand"] or None,
                        row["model"] or None,
                        age,
                        install_year,
                        STATUS_MAP.get(row["status"], "Desconocido"),
                        confidence,
                        row["visit_date"],
                        row["visit_date"],
                        row["notes"] or None,
                        now,
                        now,
                    ),
                )
                counts["assets"] += connection.total_changes - before
                connection.execute(
                    """
                    INSERT OR IGNORE INTO asset_observations
                        (asset_id, observation_id, evidence_text, field_values_json)
                    VALUES (?, ?, ?, ?)
                    """,
                    (asset_id, observation_id, row["voice_input_example"], json.dumps(row)),
                )
        return counts
