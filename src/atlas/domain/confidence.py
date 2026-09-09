"""Explainable confidence and freshness rules."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from .equipment import EquipmentCandidate, ObservationStatus


class ConfidenceBreakdown(BaseModel):
    completeness: float = Field(ge=0, le=1)
    evidence: float = Field(ge=0, le=1)
    freshness: float = Field(ge=0, le=1)
    corroboration: float = Field(ge=0, le=1)
    total: float = Field(ge=0, le=1)
    reasons: list[str]


FIELD_WEIGHTS = {
    "modality": 0.2,
    "quantity": 0.15,
    "brand": 0.2,
    "model": 0.2,
    "serial_number": 0.15,
    "age": 0.1,
}


def calculate_confidence(
    equipment: EquipmentCandidate,
    observed_on: date,
    *,
    has_photo: bool = False,
    has_voice_or_text: bool = True,
    independent_confirmations: int = 1,
    today: date | None = None,
) -> ConfidenceBreakdown:
    """Score data quality without treating model confidence as truth."""

    today = today or date.today()
    present = {
        "modality": equipment.modality is not None,
        "quantity": equipment.quantity is not None,
        "brand": equipment.brand is not None,
        "model": equipment.model is not None,
        "serial_number": equipment.serial_number is not None,
        "age": equipment.age_years is not None or equipment.installation_year is not None,
    }
    completeness = sum(FIELD_WEIGHTS[name] for name, available in present.items() if available)

    evidence = 0.25 if has_voice_or_text else 0.0
    if has_photo:
        evidence += 0.5
    if equipment.evidence_text:
        evidence += 0.25
    evidence = min(evidence, 1.0)

    days_old = max((today - observed_on).days, 0)
    freshness = max(0.0, 1.0 - days_old / (365 * 3))
    corroboration = min(1.0, max(independent_confirmations, 0) / 3)

    total = 0.45 * completeness + 0.25 * evidence + 0.15 * freshness + 0.15 * corroboration
    if equipment.status == ObservationStatus.ESTIMATED:
        total = min(total, 0.75)
    elif equipment.status == ObservationStatus.UNKNOWN:
        total = min(total, 0.45)

    reasons = [f"{sum(present.values())}/6 identity fields present"]
    reasons.append("photo evidence available" if has_photo else "no photo evidence")
    reasons.append(f"{independent_confirmations} independent confirmation(s)")
    if days_old > 365:
        reasons.append(f"observation is {days_old} days old")

    return ConfidenceBreakdown(
        completeness=round(completeness, 4),
        evidence=round(evidence, 4),
        freshness=round(freshness, 4),
        corroboration=round(corroboration, 4),
        total=round(total, 4),
        reasons=reasons,
    )


def is_stale(observed_on: date, *, today: date | None = None, max_days: int = 365) -> bool:
    today = today or date.today()
    return (today - observed_on).days > max_days
