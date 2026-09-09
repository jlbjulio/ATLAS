"""Synchronous Python bridge to the local TypeScript QVAC runtime."""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
TSX = PROJECT_ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"
QVAC_CLI = PROJECT_ROOT / "src" / "qvac" / "cli.ts"


class QvacRuntimeError(RuntimeError):
    pass


class QvacRuntime:
    def __init__(self, timeout_seconds: int = 300) -> None:
        self.timeout_seconds = timeout_seconds

    def run(self, command: str, **options: str | Path) -> dict:
        node = shutil.which("node")
        if not node or not TSX.is_file():
            raise QvacRuntimeError("Run npm install before using the QVAC runtime")
        arguments = [node, str(TSX), str(QVAC_CLI), command]
        for name, value in options.items():
            arguments.extend([f"--{name.replace('_', '-')}", str(value)])
        completed = subprocess.run(
            arguments,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=self.timeout_seconds,
            check=False,
        )
        if completed.returncode != 0:
            message = completed.stderr.strip() or completed.stdout.strip()
            raise QvacRuntimeError(message or "Local QVAC command failed")
        for line in reversed(completed.stdout.splitlines()):
            try:
                return json.loads(line)
            except json.JSONDecodeError:
                continue
        raise QvacRuntimeError("QVAC returned no JSON result")

    def health(self) -> dict:
        return self.run("health")
