"""Deterministic outbox operations for eventual P2P delivery."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime


def pending_messages(connection: sqlite3.Connection, *, limit: int = 100) -> list[dict]:
    rows = connection.execute(
        """
        SELECT * FROM sync_outbox
        WHERE state IN ('Pending', 'Retry')
        ORDER BY created_at
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def mark_delivered(connection: sqlite3.Connection, message_id: str) -> None:
    connection.execute(
        "UPDATE sync_outbox SET state = 'Delivered', updated_at = ? WHERE id = ?",
        (datetime.now(UTC).isoformat(), message_id),
    )


def mark_retry(connection: sqlite3.Connection, message_id: str) -> None:
    connection.execute(
        """
        UPDATE sync_outbox
        SET state = 'Retry', attempts = attempts + 1, updated_at = ?
        WHERE id = ?
        """,
        (datetime.now(UTC).isoformat(), message_id),
    )
