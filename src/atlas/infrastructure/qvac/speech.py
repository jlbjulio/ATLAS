"""Local audio transcription through Whisper in @qvac/sdk."""

from __future__ import annotations

from pathlib import Path

from .runtime import QvacRuntime


class SpeechService:
    def __init__(self, runtime: QvacRuntime | None = None) -> None:
        self.runtime = runtime or QvacRuntime()

    def transcribe(self, audio_path: str | Path) -> str:
        result = self.runtime.run("transcribe", audio=audio_path)
        return str(result["text"])
