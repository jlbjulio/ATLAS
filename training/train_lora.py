"""Train the ATLAS extraction adapter and record metrics in TensorBoard."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

from tensorboardX import SummaryWriter

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "language" / "qwen3-0.6b-q4_0.gguf"
TRAIN_DATA = PROJECT_ROOT / "data" / "finetuning" / "train.jsonl"
VALIDATION_DATA = PROJECT_ROOT / "data" / "finetuning" / "validation.jsonl"
OUTPUT_DIR = PROJECT_ROOT / "training" / "output"
ADAPTER_PATH = OUTPUT_DIR / "atlas-extraction-lora.gguf"
TRAINING_REPORT = OUTPUT_DIR / "training-report.json"
REQUEST_PATH = OUTPUT_DIR / "training-request.json"
QVAC_BRIDGE = PROJECT_ROOT / "training" / "qvac_finetune.ts"

LORA_CONFIG = {
    "loraRank": 8,
    "loraAlpha": 16,
    "loraSeed": 42,
    "loraModules": "attn_q,attn_k,attn_v,attn_o",
}

TRAINING_CONFIG = {
    "numberOfEpochs": 1,
    "learningRate": 0.0001,
    "lrScheduler": "cosine",
    "lrMin": 1e-8,
    "warmupRatio": 0.05,
    "warmupRatioSet": True,
    "contextLength": 768,
    "batchSize": 128,
    "microBatchSize": 64,
    "assistantLossOnly": True,
    "checkpointSaveSteps": 25,
}


def start_tensorboard() -> Path:
    logs = OUTPUT_DIR / "tensorboard"
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    subprocess.Popen(
        [
            sys.executable,
            "-m",
            "tensorboard.main",
            "--logdir",
            str(logs),
            "--host",
            "127.0.0.1",
            "--port",
            "6006",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=flags,
    )
    webbrowser.open_new_tab("http://127.0.0.1:6006")
    return logs


def count_examples(path: Path) -> int:
    with path.open("r", encoding="utf-8") as source:
        return sum(1 for line in source if line.strip())


def train() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logs = start_tensorboard()
    run_name = datetime.now().strftime("%Y%m%d-%H%M%S")
    train_count = count_examples(TRAIN_DATA)
    validation_count = count_examples(VALIDATION_DATA)
    request = {
        "modelPath": str(MODEL_PATH),
        "trainPath": str(TRAIN_DATA),
        "validationPath": str(VALIDATION_DATA),
        "adapterPath": str(ADAPTER_PATH),
        "checkpointPath": str(OUTPUT_DIR / "checkpoints"),
        "modelConfig": {"device": "gpu", "ctx_size": 768},
        "options": {**TRAINING_CONFIG, **LORA_CONFIG},
    }
    REQUEST_PATH.write_text(json.dumps(request, indent=2) + "\n", encoding="utf-8")
    print(f"Training ATLAS LoRA with {train_count} examples; validation={validation_count}")

    npx = shutil.which("npx")
    if npx is None:
        raise RuntimeError("npx was not found. Install the project's Node dependencies first.")

    process = subprocess.Popen(
        [npx, "--no-install", "tsx", str(QVAC_BRIDGE), str(REQUEST_PATH)],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    last_event: dict[str, object] = {}
    result: dict[str, object] = {}
    assert process.stdout is not None
    with SummaryWriter(str(logs / run_name)) as writer:
        for line in process.stdout:
            line = line.rstrip()
            if line.startswith("ATLAS_PROGRESS "):
                event = json.loads(line.removeprefix("ATLAS_PROGRESS "))
                step = int(event["global_steps"])
                if event.get("loss") is not None:
                    writer.add_scalar("training/loss", float(event["loss"]), step)
                if event.get("accuracy") is not None:
                    writer.add_scalar("training/accuracy", float(event["accuracy"]), step)
                writer.flush()
                last_event = event
                print(
                    f"epoch={int(event['current_epoch']) + 1} step={step} "
                    f"batch={event.get('current_batch')}/{event.get('total_batches')} "
                    f"loss={event.get('loss')} accuracy={event.get('accuracy')} "
                    f"eta={round(float(event.get('eta_ms', 0)) / 60000, 1)}m"
                )
            elif line.startswith("ATLAS_RESULT "):
                result = json.loads(line.removeprefix("ATLAS_RESULT "))
            else:
                print(line)

    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"QVAC fine-tuning failed with exit code {return_code}")
    if result.get("status") != "COMPLETED":
        raise RuntimeError(f"QVAC fine-tuning ended with status {result.get('status')}")
    if not ADAPTER_PATH.exists():
        raise RuntimeError(f"QVAC completed without creating {ADAPTER_PATH}")

    report = {
        "completed_at": datetime.now().astimezone().isoformat(),
        "base_model": str(MODEL_PATH.relative_to(PROJECT_ROOT)),
        "adapter": str(ADAPTER_PATH.relative_to(PROJECT_ROOT)),
        "train_examples": train_count,
        "validation_examples": validation_count,
        "lora": LORA_CONFIG,
        "training": TRAINING_CONFIG,
        "final_progress": last_event,
        "result": result,
        "adapter_bytes": ADAPTER_PATH.stat().st_size,
    }
    TRAINING_REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Adapter saved to {ADAPTER_PATH}")
    print(f"Training report saved to {TRAINING_REPORT}")


def main() -> None:
    for path in (MODEL_PATH, TRAIN_DATA, VALIDATION_DATA, QVAC_BRIDGE):
        if not path.exists():
            raise FileNotFoundError(path)
    train()


if __name__ == "__main__":
    main()
