"""Local identity embeddings for duplicate-candidate ranking."""

from __future__ import annotations

import json

from .runtime import QvacRuntime


class EmbeddingService:
    def __init__(self, runtime: QvacRuntime | None = None) -> None:
        self.runtime = runtime or QvacRuntime()

    def embed(self, text: str) -> list[float]:
        result = self.runtime.run("embed", text=text)
        return [float(value) for value in result["embedding"]]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        result = self.runtime.run("embed", texts_json=json.dumps(texts))
        return [[float(value) for value in row] for row in result["embedding"]]
