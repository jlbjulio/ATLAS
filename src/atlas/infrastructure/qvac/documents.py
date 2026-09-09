"""Authorized equipment-photo analysis through VisionPsy and @qvac/sdk."""

from __future__ import annotations

from pathlib import Path

from atlas.domain.equipment import CaptureSource
from atlas.domain.observations import ObservationDraft

from .runtime import QvacRuntime


class DocumentService:
    def __init__(self, runtime: QvacRuntime | None = None) -> None:
        self.runtime = runtime or QvacRuntime()

    def inspect(self, image_path: str | Path, note: str = "") -> ObservationDraft:
        result = self.runtime.run(
            "extract", text=note or "Analyze this equipment.", image=image_path
        )
        return ObservationDraft.model_validate(
            {**result, "raw_text": note, "source": CaptureSource.MULTIMODAL}
        )
