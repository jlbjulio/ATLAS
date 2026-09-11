"""Short-lived pairing tokens and QR invitations for the local ATLAS inference provider."""

from __future__ import annotations

import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException

PAIRING_CODE_ENV = "ATLAS_P2P_PAIRING_CODE"
INVITE_TTL = timedelta(minutes=5)
TOKEN_TTL = timedelta(minutes=60)


class PairingManager:
    def __init__(self) -> None:
        self._tokens: dict[str, datetime] = {}
        self._invites: dict[str, dict] = {}
        self._sessions: dict[str, dict] = {}

    def create_invitation(self, local_url: str) -> tuple[str, dict]:
        code = secrets.token_urlsafe(16)
        expires_at = datetime.now(UTC) + INVITE_TTL
        invite = {
            "code": code,
            "local_url": local_url.rstrip("/"),
            "expires_at": expires_at.isoformat(),
            "used": False,
        }
        self._invites[code] = invite
        return code, invite

    def consume_invitation(self, code: str) -> dict | None:
        invite = self._invites.get(code)
        if not invite:
            return None
        if datetime.fromisoformat(invite["expires_at"]) <= datetime.now(UTC):
            self._invites.pop(code, None)
            return None
        if invite["used"]:
            return None
        invite["used"] = True
        return invite

    def pair(self, code: str, device_name: str = "Dispositivo desconocido") -> tuple[str, datetime]:
        # Manual pairing via the configured secret.
        expected = os.environ.get(PAIRING_CODE_ENV)
        if expected and secrets.compare_digest(code, expected):
            return self._issue_token(device_name)

        # QR pairing via a consumed invitation.
        invite = self._invites.get(code)
        if invite:
            if datetime.fromisoformat(invite["expires_at"]) <= datetime.now(UTC):
                self._invites.pop(code, None)
                raise HTTPException(status_code=401, detail="Invitación expirada.")
            if not invite["used"]:
                raise HTTPException(status_code=401, detail="Invitación aún no consumida.")
            return self._issue_token(device_name)

        raise HTTPException(status_code=401, detail="Código de emparejamiento inválido.")

    def _issue_token(self, device_name: str) -> tuple[str, datetime]:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(UTC) + TOKEN_TTL
        now = datetime.now(UTC)
        self._tokens[token] = expires_at
        self._sessions[token] = {
            "device_name": device_name,
            "paired_at": now.isoformat(),
            "last_seen": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        }
        return token, expires_at

    def authorize(self, token: str | None) -> None:
        expires_at = self._tokens.get(token or "")
        if not expires_at or expires_at <= datetime.now(UTC):
            if token:
                self._tokens.pop(token, None)
                self._sessions.pop(token, None)
            raise HTTPException(status_code=401, detail="Sesión P2P ausente o expirada.")
        session = self._sessions.get(token or "")
        if session:
            session["last_seen"] = datetime.now(UTC).isoformat()

    def list_sessions(self) -> list[dict]:
        now = datetime.now(UTC)
        active = []
        expired_tokens = []
        for token, expires_at in self._tokens.items():
            if expires_at <= now:
                expired_tokens.append(token)
                continue
            session = self._sessions.get(token)
            if session:
                active.append({"token": token, **session})
        for token in expired_tokens:
            self._tokens.pop(token, None)
            self._sessions.pop(token, None)
        return active

    def revoke_session(self, token: str) -> bool:
        existed = token in self._tokens
        self._tokens.pop(token, None)
        self._sessions.pop(token, None)
        return existed


pairing_manager = PairingManager()
