"""Multimodal local capture pipeline independent from the future UI."""

from __future__ import annotations

from pathlib import Path

from atlas.application.follow_up import select_follow_up
from atlas.domain.equipment import CaptureSource
from atlas.domain.observations import EvidenceKind, ObservationDraft
from atlas.infrastructure.storage.evidence import EvidenceStore

from .documents import DocumentService
from .extraction import ExtractionService
from .speech import SpeechService


class CapturePipeline:
    def __init__(
        self,
        extraction: ExtractionService | None = None,
        documents: DocumentService | None = None,
        speech: SpeechService | None = None,
        evidence_store: EvidenceStore | None = None,
    ) -> None:
        self.extraction = extraction or ExtractionService()
        self.documents = documents or DocumentService()
        self.speech = speech or SpeechService()
        self.evidence_store = evidence_store or EvidenceStore()

    def prepare(
        self,
        *,
        text: str = "",
        audio_path: str | Path | None = None,
        image_path: str | Path | None = None,
        observer: str | None = None,
    ) -> ObservationDraft:
        transcript = text.strip()
        evidence = []
        if audio_path:
            transcript = " ".join(filter(None, [transcript, self.speech.transcribe(audio_path)]))
            evidence.append(self.evidence_store.store(audio_path, EvidenceKind.AUDIO))
        if image_path:
            draft = self.documents.inspect(image_path, transcript)
            evidence.append(self.evidence_store.store(image_path, EvidenceKind.PHOTO))
            draft.source = CaptureSource.MULTIMODAL if transcript else CaptureSource.PHOTO
        else:
            draft = self.extraction.extract(transcript)
            draft.source = CaptureSource.VOICE if audio_path else CaptureSource.TEXT

        draft.raw_text = transcript
        draft.observer = observer
        draft.evidence.extend(evidence)
        follow_up = select_follow_up(draft)
        draft.missing_fields = [follow_up.field] if follow_up else []
        draft.next_question = follow_up.question if follow_up else None
        return draft
