import asyncio
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

from tensorboardX import SummaryWriter
from tetherto.qvac_sdk import (
    Client,
    FinetuneProgressResponse,
    FinetuneRequest,
    finetune_with_progress,
    load_model,
    unload_model,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "language" / "qwen3-1.7b-q4_0.gguf"
TRAIN_DATA = PROJECT_ROOT / "data" / "finetuning" / "train.jsonl"
VALIDATION_DATA = PROJECT_ROOT / "data" / "finetuning" / "validation.jsonl"
OUTPUT_DIR = PROJECT_ROOT / "training" / "output"
SDK_DIR = PROJECT_ROOT / "node_modules" / "@qvac" / "sdk"

LORA_CONFIG = {
    "loraRank": 8,
    "loraAlpha": 16,
    "loraSeed": 42,
    "loraModules": "attn_q,attn_k,attn_v,attn_o,ffn_gate,ffn_up,ffn_down",
}

TRAINING_CONFIG = {
    "numberOfEpochs": 2,
    "learningRate": 0.0001,
    "lrScheduler": "cosine",
    "lrMin": 1e-8,
    "warmupRatio": 0.05,
    "warmupRatioSet": True,
    "contextLength": 1024,
    "batchSize": 1,
    "microBatchSize": 1,
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


async def train() -> None:
    logs = start_tensorboard()
    run_name = datetime.now().strftime("%Y%m%d-%H%M%S")

    async with Client(sdk_dir=str(SDK_DIR)) as client:
        model_id = await load_model(
            client.transport,
            model_src=str(MODEL_PATH),
            model_type="llamacpp-completion",
            model_config={"device": "gpu", "gpu_layers": 20, "ctx_size": 1024},
        )

        options = {
            "trainDatasetDir": str(TRAIN_DATA),
            "validation": {"type": "dataset", "path": str(VALIDATION_DATA)},
            "outputParametersDir": str(OUTPUT_DIR / "adapter"),
            "checkpointSaveDir": str(OUTPUT_DIR / "checkpoints"),
            **TRAINING_CONFIG,
            **LORA_CONFIG,
        }
        request = FinetuneRequest.model_validate(
            {"modelId": model_id, "operation": "start", "options": options}
        )

        try:
            with SummaryWriter(str(logs / run_name)) as writer:
                async for event in finetune_with_progress(client.transport, request):
                    if not isinstance(event, FinetuneProgressResponse):
                        print(event)
                        continue

                    step = event.global_steps
                    if event.loss is not None:
                        writer.add_scalar("training/loss", event.loss, step)
                    if event.accuracy is not None:
                        writer.add_scalar("training/accuracy", event.accuracy, step)
                    writer.flush()
                    print(f"epoch={event.current_epoch + 1} step={step} loss={event.loss}")
        finally:
            await unload_model(client.transport, model_id, clear_storage=False)


def main() -> None:
    for path in (MODEL_PATH, TRAIN_DATA, VALIDATION_DATA, SDK_DIR):
        if not path.exists():
            raise FileNotFoundError(path)
    asyncio.run(train())


if __name__ == "__main__":
    main()
