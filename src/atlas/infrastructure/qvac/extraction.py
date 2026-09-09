"""Structured text extraction through the local @qvac/sdk runtime."""

from __future__ import annotations

from atlas.domain.observations import ObservationDraft

from .runtime import QvacRuntime


class ExtractionService:
    def __init__(self, runtime: QvacRuntime | None = None) -> None:
        self.runtime = runtime or QvacRuntime()

    def extract(self, text: str) -> ObservationDraft:
        if not text.strip():
            return ObservationDraft(raw_text="")
        result = self.runtime.run("extract", text=text)
        return ObservationDraft.model_validate({**result, "raw_text": text})
