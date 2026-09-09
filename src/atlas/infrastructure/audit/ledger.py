"""Tamper-evident local audit chain for observations and assets."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import UTC, datetime
from uuid import uuid4


def canonical_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def append_audit_event(
    connection: sqlite3.Connection,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str | None,
    payload: object,
) -> str:
    previous = connection.execute(
        "SELECT event_hash FROM audit_events ORDER BY created_at DESC, id DESC LIMIT 1"
    ).fetchone()
    previous_hash = previous["event_hash"] if previous else None
    created_at = datetime.now(UTC).isoformat()
    event_id = str(uuid4())
    payload_json = canonical_json(payload)
    material = "|".join(
        [event_id, entity_type, entity_id, action, actor or "", payload_json, previous_hash or ""]
    )
    event_hash = hashlib.sha256(material.encode("utf-8")).hexdigest()
    connection.execute(
        """
        INSERT INTO audit_events
            (id, entity_type, entity_id, action, actor, payload_json,
             previous_hash, event_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event_id,
            entity_type,
            entity_id,
            action,
            actor,
            payload_json,
            previous_hash,
            event_hash,
            created_at,
        ),
    )
    return event_hash


def verify_audit_chain(connection: sqlite3.Connection) -> bool:
    rows = connection.execute("SELECT * FROM audit_events ORDER BY created_at, id").fetchall()
    previous_hash: str | None = None
    for row in rows:
        material = "|".join(
            [
                row["id"],
                row["entity_type"],
                row["entity_id"],
                row["action"],
                row["actor"] or "",
                row["payload_json"],
                previous_hash or "",
            ]
        )
        if row["previous_hash"] != previous_hash:
            return False
        if hashlib.sha256(material.encode("utf-8")).hexdigest() != row["event_hash"]:
            return False
        previous_hash = row["event_hash"]
    return True
