"""Content-addressed storage for local photos and audio evidence."""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

from atlas.domain.observations import Evidence, EvidenceKind

PROJECT_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_EVIDENCE_ROOT = PROJECT_ROOT / "data" / "local" / "evidence"


class EvidenceStore:
    def __init__(self, root: str | Path = DEFAULT_EVIDENCE_ROOT) -> None:
        self.root = Path(root)

    def store(self, source: str | Path, kind: EvidenceKind) -> Evidence:
        source_path = Path(source).resolve()
        if not source_path.is_file():
            raise FileNotFoundError(source_path)
        digest = hashlib.sha256(source_path.read_bytes()).hexdigest()
        destination = self.root / kind.value / f"{digest}{source_path.suffix.lower()}"
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists():
            shutil.copy2(source_path, destination)
        return Evidence(kind=kind, local_path=destination, sha256=digest)
