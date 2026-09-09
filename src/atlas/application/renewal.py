"""Explainable renewal and data-refresh opportunities."""

from __future__ import annotations

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field

from atlas.domain.confidence import is_stale
from atlas.domain.equipment import InstalledAsset


class OpportunityKind(StrEnum):
    RENEWAL_REVIEW = "Renewal review"
    DATA_REFRESH = "Data refresh"
    IDENTITY_VERIFICATION = "Identity verification"


class Opportunity(BaseModel):
    asset_id: str
    kind: OpportunityKind
    score: int = Field(ge=0, le=100)
    reasons: list[str]
    recommended_action: str


def evaluate_opportunities(
    asset: InstalledAsset, *, today: date | None = None
) -> list[Opportunity]:
    """Produce review candidates, never unsupported sales guarantees."""

    today = today or date.today()
    opportunities: list[Opportunity] = []
    age = asset.age_years
    if age is None and asset.installation_year is not None:
        age = max(0, today.year - asset.installation_year)

    if age is not None and age >= 7:
        score = min(95, 45 + round(age * 4) + round((1 - (asset.confidence or 0)) * 10))
        opportunities.append(
            Opportunity(
                asset_id=asset.id,
                kind=OpportunityKind.RENEWAL_REVIEW,
                score=score,
                reasons=[f"reported age is approximately {age:g} years"],
                recommended_action="Validate lifecycle, service history, and customer needs.",
            )
        )

    if is_stale(asset.last_seen, today=today):
        days = (today - asset.last_seen).days
        opportunities.append(
            Opportunity(
                asset_id=asset.id,
                kind=OpportunityKind.DATA_REFRESH,
                score=min(100, 50 + days // 30),
                reasons=[f"last observation is {days} days old"],
                recommended_action="Prioritize this asset during the next authorized visit.",
            )
        )

    missing_identity = [
        field
        for field in ("brand", "model", "serial_number")
        if getattr(asset, field) is None
    ]
    if missing_identity:
        opportunities.append(
            Opportunity(
                asset_id=asset.id,
                kind=OpportunityKind.IDENTITY_VERIFICATION,
                score=40 + 15 * len(missing_identity),
                reasons=[f"missing {', '.join(missing_identity)}"],
                recommended_action="Capture an authorized equipment-label photo.",
            )
        )

    return sorted(opportunities, key=lambda item: item.score, reverse=True)
