"""Field observation, evidence, and customer entities."""

from __future__ import annotations

from datetime import UTC, date, datetime
from enum import StrEnum
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .equipment import CaptureSource, EquipmentCandidate, ObservationStatus, normalize_text


def utc_now() -> datetime:
    return datetime.now(UTC)


class EvidenceKind(StrEnum):
    TEXT = "text"
    AUDIO = "audio"
    PHOTO = "photo"


class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str = Field(min_length=1)
    city: str
    country: str

    @field_validator("name", "city", "country", mode="before")
    @classmethod
    def clean_required_text(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_text(value)
        return value


class Evidence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    kind: EvidenceKind
    local_path: Path | None = None
    sha256: str | None = None
    excerpt: str | None = None


class ObservationDraft(BaseModel):
    """Unconfirmed structured result returned by the local AI pipeline."""

    model_config = ConfigDict(str_strip_whitespace=True)

    client: str | None = None
    city: str | None = None
    country: str | None = None
    observer: str | None = None
    visit_date: date = Field(default_factory=date.today)
    source: CaptureSource = CaptureSource.TEXT
    raw_text: str = ""
    equipment: list[EquipmentCandidate] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    next_question: str | None = None
    privacy_flags: list[str] = Field(default_factory=list)

    @field_validator("client", "city", "country", "observer", "next_question", mode="before")
    @classmethod
    def clean_optional_text(cls, value: object) -> object:
        return normalize_text(value) if isinstance(value, str) else value

    @property
    def ready_for_review(self) -> bool:
        return bool(self.client and self.city and self.country and self.equipment)


class ObservationRecord(ObservationDraft):
    id: str = Field(default_factory=lambda: str(uuid4()))
    status: ObservationStatus = ObservationStatus.REPORTED
    confidence_score: float = Field(default=0, ge=0, le=1)
    version: int = Field(default=1, ge=1)
    created_at: datetime = Field(default_factory=utc_now)
    confirmed_at: datetime | None = None
