"""Explainable duplicate and conflict detection."""

from __future__ import annotations

from pydantic import BaseModel, Field
from rapidfuzz.fuzz import ratio

from .equipment import EquipmentCandidate, normalized_key


class DuplicateAssessment(BaseModel):
    score: float = Field(ge=0, le=1)
    is_candidate: bool
    is_exact_serial_match: bool
    reasons: list[str]
    conflicts: list[str]


def _similarity(left: str | None, right: str | None) -> float:
    if not left or not right:
        return 0.0
    return ratio(normalized_key(left), normalized_key(right)) / 100


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = sum(value * value for value in left) ** 0.5
    right_norm = sum(value * value for value in right) ** 0.5
    if not left_norm or not right_norm:
        return 0.0
    return max(-1.0, min(1.0, numerator / (left_norm * right_norm)))


def assess_duplicate(
    incoming: EquipmentCandidate,
    existing: EquipmentCandidate,
    *,
    same_customer: bool,
    embedding_similarity: float | None = None,
    threshold: float = 0.72,
) -> DuplicateAssessment:
    reasons: list[str] = []
    conflicts: list[str] = []

    serial_match = bool(
        incoming.serial_number
        and existing.serial_number
        and normalized_key(incoming.serial_number) == normalized_key(existing.serial_number)
    )
    if serial_match:
        reasons.append("exact serial number")

    modality = _similarity(incoming.modality, existing.modality)
    brand = _similarity(incoming.brand, existing.brand)
    model = _similarity(incoming.model, existing.model)
    text_score = 0.4 * modality + 0.25 * brand + 0.35 * model
    if embedding_similarity is not None:
        text_score = 0.7 * text_score + 0.3 * max(0.0, min(embedding_similarity, 1.0))
        reasons.append(f"semantic similarity {embedding_similarity:.2f}")

    score = text_score * (1.0 if same_customer else 0.45)
    if same_customer:
        reasons.append("same customer")
    if serial_match:
        score = 1.0

    identity_overlap = modality >= 0.8 and (brand >= 0.6 or model >= 0.6)
    if serial_match and incoming.model and existing.model and model < 0.5:
        conflicts.append("same serial number but different model")
    if (
        identity_overlap
        and incoming.quantity
        and existing.quantity
        and incoming.quantity != existing.quantity
    ):
        conflicts.append("different reported quantity")
    if identity_overlap and incoming.age_years is not None and existing.age_years is not None:
        if abs(incoming.age_years - existing.age_years) > 2:
            conflicts.append("age estimates differ by more than two years")

    return DuplicateAssessment(
        score=round(score, 4),
        is_candidate=score >= threshold or serial_match,
        is_exact_serial_match=serial_match,
        reasons=reasons,
        conflicts=conflicts,
    )
