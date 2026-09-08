from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MINIMUM_NODE = (22, 17, 0)


def run(*command: str) -> None:
    print(f"\n> {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=ROOT, check=True)


def npm_executable() -> str:
    npm = shutil.which("npm.cmd") or shutil.which("npm")
    if not npm:
        raise SystemExit("No se encontró npm en PATH.")
    return npm


def node_version() -> tuple[int, int, int]:
    node = shutil.which("node")
    if not node or not npm_executable():
        raise SystemExit("Instala Node.js 22.17 o superior antes de continuar.")
    output = subprocess.check_output([node, "--version"], text=True).strip()
    match = re.fullmatch(r"v(\d+)\.(\d+)\.(\d+)", output)
    if not match:
        raise SystemExit(f"No se pudo interpretar la versión de Node.js: {output}")
    return tuple(int(value) for value in match.groups())


def validate_models() -> None:
    config = json.loads((ROOT / "config" / "models.json").read_text(encoding="utf-8"))
    missing: list[str] = []
    for model in config["models"].values():
        for key, value in model.items():
            if isinstance(value, str) and (key.endswith("path") or key in {"euro", "afri"}):
                if not (ROOT / value).exists():
                    missing.append(value)
    if missing:
        raise SystemExit("Faltan modelos:\n" + "\n".join(missing))


def main() -> None:
    if os.environ.get("VIRTUAL_ENV") or sys.prefix != sys.base_prefix:
        raise SystemExit("Sal del entorno virtual. Este proyecto usa Python sin .venv.")
    if sys.version_info < (3, 11):  # noqa: UP036 - useful message on teammate machines
        raise SystemExit("Se requiere Python 3.11 o superior.")
    if node_version() < MINIMUM_NODE:
        raise SystemExit("Se requiere Node.js 22.17 o superior.")

    run(sys.executable, "-m", "pip", "install", "-r", "python-requirements.txt")
    npm = npm_executable()
    run(npm, "ci")
    run(npm, "install", "--global", "@qvac/cli@0.13.0")
    run(npm, "run", "models:download")
    validate_models()
    run(npm, "run", "check")
    print("\nATLAS está listo para desarrollar.")


if __name__ == "__main__":
    main()
