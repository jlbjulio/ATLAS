"""Capture, review, deduplicate, and persist a field observation."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Protocol

from pydantic import BaseModel

from atlas.application.follow_up import FollowUp, select_follow_up
from atlas.domain.confidence import calculate_confidence
from atlas.domain.duplicates import DuplicateAssessment, assess_duplicate, cosine_similarity
from atlas.domain.equipment import ObservationStatus
from atlas.domain.observations import EvidenceKind, ObservationDraft, ObservationRecord
from atlas.infrastructure.repositories.observations import ObservationRepository


class CaptureResult(BaseModel):
    observation_id: str
    asset_ids: list[str]
    duplicate_candidates: list[DuplicateAssessment]


class EmbeddingProvider(Protocol):
    def embed_many(self, texts: list[str]) -> list[list[float]]: ...


class CaptureService:
    def __init__(
        self,
        repository: ObservationRepository,
        embeddings: EmbeddingProvider | None = None,
    ) -> None:
        self.repository = repository
        self.embeddings = embeddings

    def review(self, draft: ObservationDraft) -> FollowUp | None:
        follow_up = select_follow_up(draft)
        draft.next_question = follow_up.question if follow_up else None
        draft.missing_fields = [follow_up.field] if follow_up else []
        return follow_up

    def confirm(self, draft: ObservationDraft, *, actor: str) -> CaptureResult:
        if draft.privacy_flags:
            raise ValueError("Remove or redact sensitive visual content before confirmation")
        follow_up = self.review(draft)
        if follow_up and follow_up.priority >= 80:
            raise ValueError(f"Required information is missing: {follow_up.field}")

        has_photo = any(item.kind == EvidenceKind.PHOTO for item in draft.evidence)
        scores = [
            calculate_confidence(
                equipment,
                draft.visit_date,
                has_photo=has_photo,
                has_voice_or_text=bool(draft.raw_text),
            ).total
            for equipment in draft.equipment
        ]
        record = ObservationRecord(
            **draft.model_dump(),
            status=ObservationStatus.CONFIRMED,
            confidence_score=sum(scores) / len(scores) if scores else 0,
            confirmed_at=datetime.now(UTC),
        )

        customer_id = self.repository.find_customer_id(
            record.client or "", record.city or "", record.country or ""
        )
        existing_assets = self.repository.list_assets(customer_id) if customer_id else []
        vectors: list[list[float]] = []
        if self.embeddings and record.equipment and existing_assets:
            identity_texts = [
                asset.identity_text() for asset in [*record.equipment, *existing_assets]
            ]
            try:
                vectors = self.embeddings.embed_many(identity_texts)
            except RuntimeError:
                vectors = []
        asset_ids = self.repository.save_confirmed(record, actor=actor)

        assessments: list[DuplicateAssessment] = []
        existing_offset = len(record.equipment)
        for incoming_index, incoming in enumerate(record.equipment):
            for existing_index, existing in enumerate(existing_assets):
                similarity = None
                if len(vectors) == existing_offset + len(existing_assets):
                    similarity = cosine_similarity(
                        vectors[incoming_index],
                        vectors[existing_offset + existing_index],
                    )
                assessment = assess_duplicate(
                    incoming,
                    existing,
                    same_customer=True,
                    embedding_similarity=similarity,
                )
                if assessment.is_candidate or assessment.conflicts:
                    self.repository.save_duplicate_candidate(
                        incoming.id, existing.id, assessment
                    )
                    assessments.append(assessment)
        return CaptureResult(
            observation_id=record.id,
            asset_ids=asset_ids,
            duplicate_candidates=assessments,
        )
