# ATLAS | Installed Base Intelligence

ATLAS turns field observations, equipment photos, and spoken notes into a reliable, actionable view of a customer's installed base. It runs inference directly on local hardware, remains useful without connectivity, and converts incomplete observations into structured records for service, planning, and renewal decisions.

## From observation to decision

```text
Authorized photo + voice or text
→ local multimodal understanding
→ structured record with supporting evidence
→ highest-value follow-up question
→ human confirmation
→ auditable history and local synchronization
→ Customer 360 and data-quality insights
```

A single capture can create multiple records when different modalities, manufacturers, models, or asset ages are observed. ATLAS preserves unknown values, never merges assets automatically, and keeps every field traceable to its original evidence.

## Capabilities

- **Smart Capture:** collect observations through photos, voice, or text without requiring connectivity.
- **Asset Identity:** structure customer, location, modality, quantity, manufacturer, model, serial number, installation year, and estimated age.
- **Next Best Question:** request the missing field that would add the most value to the record.
- **Confidence Engine:** calculate an explainable score from completeness, evidence quality, recency, and independent confirmation.
- **Duplicate Intelligence:** identify likely duplicate or conflicting observations while preserving the originals.
- **Customer 360:** inspect installed equipment, latest observations, verification status, and data quality by customer.
- **Territory Intelligence:** aggregate modalities, manufacturers, age, and verification quality across locations.
- **Opportunity Radar:** surface aging or insufficiently verified assets that may require review.
- **Evidence Ledger:** trace confirmed fields and changes back to their source capture.
- **Offline Outbox:** persist work immediately in SQLite and synchronize idempotent events when a connection becomes available.
- **Shared Compute:** pair a phone with a laptop over the local network and delegate inference through a QR-based connection.
- **On-device Vision:** inspect authorized equipment labels and nameplates with VisionPsy Nano.

## Local intelligence

ATLAS runs its AI operations through `@qvac/sdk` using local model paths and no external inference API.

| Task | Model | Quantization |
| --- | --- | --- |
| Visual understanding | `qvac/VisionPsy-Nano-460M-Flash-GGUFs` | Q4_K_M with imatrix and Q8 projector |
| Structured extraction | Qwen3 600M Instruct | Q4_0 |
| Transcription | Whisper Small with Silero VAD | Q8_0 |
| Asset similarity | EmbeddingGemma 300M | Q8_0 |

VisionPsy interprets authorized equipment and nameplate images. Qwen transforms evidence into strict structured output, Whisper processes spoken observations, and EmbeddingGemma ranks potential duplicate assets.

Model output is always treated as a candidate. A user must review the extracted fields before they become part of the installed-base record.

Natural-language inventory queries use Qwen3 1.7B when `models/language/qwen3-1.7b-q4_0.gguf` is available and fall back to Qwen3 0.6B otherwise. Download the larger query model with:

```console
ATLAS_DOWNLOAD_QUERY_1_7B=1 npm run models:download
```

Select a specific query model with `ATLAS_QUERY_MODEL=0.6b` or `ATLAS_QUERY_MODEL=1.7b`.

The backend maintains a local worker at `src/qvac/worker-server.ts`. It loads models once and serves subsequent extraction and natural-language requests over standard input/output. If the worker is unavailable, an operation can fall back to the single-use local CLI.

## Privacy and trust

- Photos containing patients, medical records, badges, or identifiable people are not accepted.
- Sensitive-content detection blocks confirmation until the image is removed or redacted.
- Files, indexes, metrics, and operational records remain on the device.
- Natural-language questions are converted into an allowlisted filter contract; model-generated SQL is never executed.
- Renewal signals indicate that an asset needs review, not that it should automatically be replaced.
- Every confirmed change produces an audit record and an idempotent synchronization event.

## Project structure

- `src/atlas/`: domain logic, capture pipeline, persistence, matching, confidence, analytics, and synchronization.
- `src/qvac/`: local model worker, inference adapters, and QVAC commands.
- `web/`: browser-based operations interface and API server.
- `mobile/`: Android field-capture application.
- `schemas/`: structured extraction and validation contracts.
- `migrations/`: SQLite schema migrations.
- `training/`: LoRA training and evaluation.
- `data/seed/`: synthetic installed-base observations.
- `data/evaluation/`: reproducible extraction, inconsistency, and voice cases.
- `data/finetuning/`: synthetic SFT fixtures for structured extraction.
- `data/local/`: local databases, evidence, queues, and metrics excluded from Git.
- `config/models.json`: model paths and runtime configuration.

## Installation

Reference requirements:

- Windows 11
- Python 3.11 or newer
- Node.js 22.17 or newer
- 16 GB of RAM recommended
- A consumer NVIDIA GPU is recommended for faster local inference

ATLAS uses the system Python installation and does not require a virtual environment.

```console
python tools/prepare_environment.py
```

The setup script installs dependencies, downloads and verifies model assets, initializes local storage, and runs the project checks.

## Core commands

```console
python -m atlas.main init
python -m atlas.main seed
python -m atlas.main capture --text "Two CT systems observed at DemoCare Hospital"
python -m atlas.main capture --text "Reviewed observation" --confirm --observer "user"
python -m atlas.main search --question "CT systems in Panama older than seven years"
python -m atlas.main summary
npm run qvac:health
```

## Web application

```console
npm install
npm run dev
```

## Android application

From `mobile/`, after configuring the Android toolchain:

```console
cd mobile
npm install
npm run prebuild -- --platform android
cd android
./gradlew assembleRelease
```

The release package is generated at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

Model weights are downloaded and verified by `tools/download-models.js`. They remain outside Git, and their expected locations are defined in `config/models.json`.

For a reproducible product walkthrough, see [`DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md).

## Fine-tuning

ATLAS can use a locally evaluated LoRA adapter for structured extraction. When no approved adapter is configured, it uses the local base model.

```console
npm run train:evaluate
```

Training data is synthetic and stored under `data/finetuning/`. The repository currently provides adapter evaluation through the command above; LoRA training is run directly from the scripts under `training/` when required. Training metrics can be inspected locally with TensorBoard.

## Verification

```console
npm run check
```

## Data

- `data/source/` preserves original imported source files.
- `data/seed/installed-base.csv` contains synthetic installed-base observations.
- `data/evaluation/` contains reproducible validation cases.
- `data/finetuning/` contains synthetic structured-extraction fixtures.
- `data/local/` stores private runtime state and is excluded from Git.

Demo customers, manufacturers, models, and operational scenarios are fictional.

## Networking from WSL

When the backend runs inside WSL, expose the API and development server through the Windows host so a phone on the same network can reach them.

Run in an elevated Windows PowerShell session:

```powershell
$wsl_ip = (wsl hostname -I).Trim().Split()[0]

netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip

New-NetFirewallRule -DisplayName "ATLAS Backend 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "ATLAS Web 5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
```

Start the services from WSL:

```bash
ATLAS_P2P_PAIRING_CODE=local-pairing-code uvicorn web.server.main:app --host 0.0.0.0 --port 8000 --reload
npm run dev -- --host 0.0.0.0 --port 5173
```

Use the laptop's Wi-Fi address—not the WSL virtual address—from the phone. Both devices must be connected to a network that permits device-to-device communication.

## License

Original source code is available under the MIT License. Models, datasets, imported files, and third-party components retain their respective licenses and terms.
