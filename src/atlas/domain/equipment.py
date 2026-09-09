"""Equipment entities shared by capture, quality, and inventory use cases."""

from __future__ import annotations

import re
from datetime import date
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ObservationStatus(StrEnum):
    """How strongly an equipment fact is supported."""

    CONFIRMED = "Confirmado"
    REPORTED = "Reportado"
    ESTIMATED = "Estimado"
    UNKNOWN = "Desconocido"


class CaptureSource(StrEnum):
    VOICE = "Voice"
    TEXT = "Text"
    PHOTO = "Photo"
    MULTIMODAL = "Multimodal"
    IMPORT = "Import"


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    compact = " ".join(value.strip().split())
    return compact or None


def normalized_key(value: str | None) -> str:
    value = normalize_text(value) or ""
    return re.sub(r"[^a-z0-9]+", " ", value.casefold()).strip()


class EquipmentCandidate(BaseModel):
    """One equipment group extracted from a field observation."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(default_factory=lambda: str(uuid4()))
    modality: str | None = None
    quantity: int | None = Field(default=None, ge=1)
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    age_years: float | None = Field(default=None, ge=0)
    installation_year: int | None = Field(default=None, ge=1900, le=2200)
    status: ObservationStatus = ObservationStatus.UNKNOWN
    confidence: float | None = Field(default=None, ge=0, le=1)
    evidence_text: str | None = None
    notes: str | None = None

    @field_validator(
        "modality",
        "brand",
        "model",
        "serial_number",
        "evidence_text",
        "notes",
        mode="before",
    )
    @classmethod
    def clean_optional_text(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.strip().casefold() in {"", "unknown", "desconocido", "n/a", "null"}:
            return None
        return normalize_text(value)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: object) -> object:
        aliases = {
            "Confirmed": ObservationStatus.CONFIRMED,
            "Reported": ObservationStatus.REPORTED,
            "Estimated": ObservationStatus.ESTIMATED,
            "Unknown": ObservationStatus.UNKNOWN,
        }
        return aliases.get(value, value)

    def resolved_installation_year(self, observed_on: date) -> int | None:
        if self.installation_year is not None:
            return self.installation_year
        if self.age_years is None:
            return None
        return observed_on.year - round(self.age_years)

    def identity_text(self) -> str:
        return " | ".join(
            filter(
                None,
                [
                    normalized_key(self.modality),
                    normalized_key(self.brand),
                    normalized_key(self.model),
                    normalized_key(self.serial_number),
                ],
            )
        )


class InstalledAsset(EquipmentCandidate):
    """Canonical equipment record built from one or more observations."""

    customer_id: str
    first_seen: date
    last_seen: date
    independent_confirmations: int = Field(default=1, ge=0)
