"""FastAPI server for ATLAS - wraps Python core + QVAC runtime."""

from __future__ import annotations

import json
import logging
import os
import sys
import tempfile
from collections import Counter
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SRC_ROOT = PROJECT_ROOT / "src"
MODEL_CONFIG_PATH = PROJECT_ROOT / "config" / "models.json"
logger = logging.getLogger(__name__)
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from atlas.application.capture import CaptureService  # noqa: E402
from atlas.application.search import InventoryFilters, compile_filters  # noqa: E402
from atlas.domain.observations import ObservationDraft  # noqa: E402
from atlas.infrastructure.database.sqlite import SQLiteDatabase  # noqa: E402
from atlas.infrastructure.qvac.runtime import QvacRuntime  # noqa: E402
from atlas.infrastructure.repositories.observations import ObservationRepository  # noqa: E402


class HealthResponse(BaseModel):
    local_only: bool
    models_exist: dict[str, bool]
    database: str
    sqlite_version: str


class ExtractRequest(BaseModel):
    text: str
    client: str | None = None
    city: str | None = None
    country: str | None = None


class ExtractResponse(BaseModel):
    draft: dict
    missing_fields: list[str]
    next_question: str | None


class TranscribeResponse(BaseModel):
    text: str


class SearchRequest(BaseModel):
    question: str


class SearchResponse(BaseModel):
    results: list[dict]
    filters_applied: dict
    intent: str


class DashboardStatsResponse(BaseModel):
    total_equipment: int
    total_clients: int
    pending_confirmations: int
    renewal_opportunities: int
    by_modality: dict[str, int]
    status_counts: dict[str, int]


def get_model_files() -> dict[str, Path]:
    config = json.loads(MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
    models = config["models"]
    return {
        "visionpsy-nano": PROJECT_ROOT / models["vision"]["path"],
        "visionpsy-mmproj": PROJECT_ROOT / models["vision"]["projector_path"],
        "qwen3-0.6b": PROJECT_ROOT / models["extraction"]["path"],
        "whisper-small": PROJECT_ROOT / models["transcription"]["path"],
        "silero-vad": PROJECT_ROOT / models["transcription"]["vad_path"],
        "embeddinggemma-300m": PROJECT_ROOT / models["duplicates"]["path"],
    }


def require_models(*names: str) -> None:
    missing = [name for name in names if not get_model_files()[name].is_file()]
    if missing:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "local_models_unavailable",
                "message": "Los modelos locales requeridos no están disponibles.",
                "missing_models": missing,
                "action": "Ejecuta npm run models:download en la raíz del proyecto.",
            },
        )


# Extensiones que el runtime QVAC decodifica localmente con su FFmpeg embebido.
# Fuera de esta lista el runtime recibe los bytes crudos como PCM (fallo para
# .webm/.opus/.mov grabados con MediaRecorder), así que se normalizan a .ogg,
# que el FFmpeg embebido detecta por contenido aunque el contenedor real sea WebM.
QVAC_DECODABLE_SUFFIXES = {".mp3", ".m4a", ".ogg", ".flac", ".aac", ".wav"}


def audio_suffix_for_runtime(filename: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix in QVAC_DECODABLE_SUFFIXES or suffix == ".raw":
        return suffix
    return ".ogg"


def get_database() -> SQLiteDatabase:
    return SQLiteDatabase()


def get_qvac_runtime() -> QvacRuntime:
    return QvacRuntime()


def get_observation_repo(
    db: Annotated[SQLiteDatabase, Depends(get_database)]
) -> ObservationRepository:
    return ObservationRepository(db)


def get_capture_service(
    repo: Annotated[ObservationRepository, Depends(get_observation_repo)],
) -> CaptureService:
    return CaptureService(repo)


app = FastAPI(title="ATLAS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DIST_DIR = PROJECT_ROOT / "web" / "dist"
if DIST_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=DIST_DIR), name="static")


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    model_files = {name: path.is_file() for name, path in get_model_files().items()}
    return HealthResponse(
        local_only=True,
        models_exist=model_files,
        database="sqlite",
        sqlite_version="3.x",
    )


@app.get("/api/installed-base")
async def installed_base(
    repo: Annotated[ObservationRepository, Depends(get_observation_repo)]
) -> list[dict]:
    summaries = repo.customer_summary()
    result = []
    for summary in summaries:
        assets = repo.list_assets(str(summary["id"]))
        result.append(
            {
                **summary,
                "assets": [asset.model_dump(mode="json") for asset in assets],
            }
        )
    return result


@app.get("/api/dashboard", response_model=DashboardStatsResponse)
async def dashboard_stats(
    repo: Annotated[ObservationRepository, Depends(get_observation_repo)]
) -> DashboardStatsResponse:
    assets = repo.list_assets()
    customers = repo.customer_summary()

    total_equipment = len(assets)
    total_clients = len(customers)
    pending_confirmations = sum(1 for a in assets if a.status.value != "Confirmado")
    renewal_opportunities = sum(1 for a in assets if a.age_years and a.age_years > 7)

    return DashboardStatsResponse(
        total_equipment=total_equipment,
        total_clients=total_clients,
        pending_confirmations=pending_confirmations,
        renewal_opportunities=renewal_opportunities,
        by_modality=dict(Counter(asset.modality or "OTHER" for asset in assets)),
        status_counts=dict(Counter(asset.status.value for asset in assets)),
    )


@app.post("/api/capture/extract", response_model=ExtractResponse)
async def extract_equipment(
    request: ExtractRequest,
    runtime: Annotated[QvacRuntime, Depends(get_qvac_runtime)],
) -> ExtractResponse:
    require_models("qwen3-0.6b")
    context = ""
    if request.client:
        context += f"Cliente: {request.client}\n"
    if request.city:
        context += f"Ciudad: {request.city}\n"
    if request.country:
        context += f"País: {request.country}\n"
    context += f"Texto: {request.text}"

    try:
        extracted = runtime.run("extract", text=context)
    except Exception as error:
        logger.exception("Local extraction failed")
        raise HTTPException(
            status_code=500,
            detail="La extracción local falló. Revisa el runtime QVAC.",
        ) from error

    equipment = extracted.get("equipment", [])
    missing = extracted.get("missing_fields", [])
    next_q = extracted.get("next_question")

    draft = {
        "client": request.client,
        "city": request.city,
        "country": request.country,
        "raw_text": request.text,
        "equipment": equipment,
        "source": "text",
        "visit_date": str(__import__("datetime").date.today()),
        "observer": "web-user",
        "evidence": [],
        "missing_fields": missing,
        "next_question": next_q,
        "privacy_flags": [],
    }

    return ExtractResponse(draft=draft, missing_fields=missing, next_question=next_q)


@app.post("/api/capture/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: Annotated[UploadFile, File(...)],
    runtime: Annotated[QvacRuntime, Depends(get_qvac_runtime)],
) -> TranscribeResponse:
    require_models("whisper-small", "silero-vad")
    suffix = audio_suffix_for_runtime(file.filename)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        result = runtime.run("transcribe", audio=tmp_path)
        text = result.get("text", "")
    except Exception as error:
        logger.exception("Local transcription failed")
        raise HTTPException(
            status_code=500,
            detail="La transcripción local falló. Revisa el runtime QVAC.",
        ) from error
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return TranscribeResponse(text=text)


@app.post("/api/capture/confirm")
async def confirm_capture(
    draft: dict,
    service: Annotated[CaptureService, Depends(get_capture_service)],
) -> dict:
    try:
        obs_draft = ObservationDraft(**draft)
        result = service.confirm(obs_draft, actor="web-user")
        return {
            "observation_id": result.observation_id,
            "asset_ids": result.asset_ids,
            "duplicate_candidates": [d.model_dump() for d in result.duplicate_candidates],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confirmation failed: {e}") from e


@app.post("/api/search", response_model=SearchResponse)
async def search_inventory(
    request: SearchRequest,
    repo: Annotated[ObservationRepository, Depends(get_observation_repo)],
    runtime: Annotated[QvacRuntime, Depends(get_qvac_runtime)],
) -> SearchResponse:
    require_models("qwen3-0.6b")
    try:
        extracted = runtime.run("query", text=request.question)
        filters = InventoryFilters.model_validate(extracted)
        sql, values = compile_filters(filters)
        results = repo.raw_query(sql, values)
    except Exception as error:
        logger.exception("Local inventory search failed")
        raise HTTPException(
            status_code=500,
            detail="La consulta local falló. Revisa el runtime QVAC.",
        ) from error

    if filters.minimum_age_years is not None or filters.maximum_age_years is not None:
        intent = "LIST_EQUIPMENT_BY_AGE"
    elif filters.brand:
        intent = "LIST_EQUIPMENT_BY_BRAND"
    elif filters.modality:
        intent = "LIST_EQUIPMENT_BY_MODALITY"
    elif filters.stale_only:
        intent = "RENEWAL_OPPORTUNITIES"
    elif filters.customer or filters.country or filters.city:
        intent = "LIST_CLIENTS"
    else:
        intent = "UNKNOWN"
    return SearchResponse(results=results, filters_applied=filters.model_dump(), intent=intent)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
