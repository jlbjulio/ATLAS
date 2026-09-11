"""Synchronous Python bridge to the local TypeScript QVAC runtime."""

from __future__ import annotations

import atexit
import json
import logging
import queue
import shutil
import subprocess
import threading
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[4]
TSX = PROJECT_ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"
QVAC_CLI = PROJECT_ROOT / "src" / "qvac" / "cli.ts"
QVAC_WORKER = PROJECT_ROOT / "src" / "qvac" / "worker-server.ts"
WORKER_COMMANDS = {"query", "answer"}
WORKER_TIMEOUT_SECONDS = 300

logger = logging.getLogger(__name__)


class QvacRuntimeError(RuntimeError):
    pass


class QvacWorker:
    """Keeps one Node process with the model loaded between requests."""

    def __init__(self) -> None:
        self._process: subprocess.Popen[str] | None = None
        self._responses: queue.Queue[dict] = queue.Queue()
        self._lock = threading.RLock()
        self._next_id = 0

    def _start(self) -> None:
        node = shutil.which("node")
        if not node or not TSX.is_file() or not QVAC_WORKER.is_file():
            raise QvacRuntimeError("Run npm install before using the QVAC worker")
        responses: queue.Queue[dict] = queue.Queue()
        self._responses = responses
        self._process = subprocess.Popen(
            [node, str(TSX), str(QVAC_WORKER)],
            cwd=PROJECT_ROOT,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )
        threading.Thread(
            target=self._read_stdout, args=(self._process, responses), daemon=True
        ).start()

    @staticmethod
    def _read_stdout(
        process: subprocess.Popen[str], responses: queue.Queue[dict]
    ) -> None:
        if process.stdout is None:
            return
        for line in process.stdout:
            stripped = line.strip()
            if not stripped:
                continue
            try:
                payload = json.loads(stripped)
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict) and "id" in payload:
                responses.put(payload)

    def request(self, payload: dict, timeout: float = WORKER_TIMEOUT_SECONDS) -> dict:
        with self._lock:
            if self._process is None or self._process.poll() is not None:
                self._start()
            process = self._process
            if process is None or process.stdin is None:
                raise QvacRuntimeError("QVAC worker failed to start")
            self._next_id += 1
            request_id = self._next_id
            message = json.dumps({"id": request_id, **payload}, ensure_ascii=False)
            process.stdin.write(f"{message}\n")
            process.stdin.flush()
            try:
                response = self._responses.get(timeout=timeout)
            except queue.Empty as error:
                self.stop()
                raise QvacRuntimeError("QVAC worker timed out") from error
            if response.get("id") != request_id:
                raise QvacRuntimeError("QVAC worker returned an unexpected response")
            if not response.get("ok"):
                raise QvacRuntimeError(
                    str(response.get("error") or "QVAC worker request failed")
                )
            result = response.get("result")
            return result if isinstance(result, dict) else {"result": result}

    def stop(self) -> None:
        with self._lock:
            process, self._process = self._process, None
        if process is None:
            return
        try:
            if process.stdin is not None:
                process.stdin.close()
            process.terminate()
            process.wait(timeout=5)
        except Exception:  # pragma: no cover - best effort shutdown
            process.kill()


_worker = QvacWorker()
atexit.register(_worker.stop)


class QvacRuntime:
    def __init__(self, timeout_seconds: int = 300) -> None:
        self.timeout_seconds = timeout_seconds

    def run(self, command: str, **options: str | Path) -> dict:
        if command in WORKER_COMMANDS:
            try:
                return _worker.request({"command": command, **options})
            except QvacRuntimeError as error:
                logger.warning(
                    "QVAC worker unavailable (%s); using one-shot CLI", error
                )
        return self._run_cli(command, **options)

    def _run_cli(self, command: str, **options: str | Path) -> dict:
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
        return self._run_cli("health")
