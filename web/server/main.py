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

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

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
from atlas.infrastructure.qvac.pipeline import CapturePipeline  # noqa: E402
from atlas.infrastructure.qvac.runtime import QvacRuntime  # noqa: E402
from atlas.infrastructure.repositories.observations import ObservationRepository  # noqa: E402
from web.server.p2p import pairing_manager  # noqa: E402


class HealthResponse(BaseModel):
    local_only: bool
    models_exist: dict[str, bool]
    database: str
    sqlite_version: str
    extraction_mode: str


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


class P2PPairRequest(BaseModel):
    code: str = Field(min_length=8, max_length=128)
    device_name: str = Field(min_length=1, max_length=80)


class P2PPairResponse(BaseModel):
    token: str
    expires_at: str
    capabilities: list[str]


class P2PExtractRequest(BaseModel):
    text: str = Field(min_length=1, max_length=12_000)


class P2PExtractionResponse(BaseModel):
    equipments: list[dict]
    missing_fields: list[str]
    next_question: str | None
    confidence: float


class P2PInvitationCreate(BaseModel):
    local_url: str = Field(pattern=r"^https?://")


class P2PInvitationResponse(BaseModel):
    code: str
    invite_url: str
    expires_at: str


class P2PInvitationConsume(BaseModel):
    code: str = Field(min_length=8, max_length=64)


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
        "extraction-adapter": PROJECT_ROOT
        / models["extraction"]["optional_lora_path"],
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


def get_capture_pipeline() -> CapturePipeline:
    return CapturePipeline()


def get_observation_repo(
    db: Annotated[SQLiteDatabase, Depends(get_database)]
) -> ObservationRepository:
    return ObservationRepository(db)


def get_capture_service(
    repo: Annotated[ObservationRepository, Depends(get_observation_repo)],
) -> CaptureService:
    return CaptureService(repo)


def authorize_p2p(
    token: Annotated[str | None, Header(alias="X-ATLAS-P2P-Token")] = None,
) -> None:
    pairing_manager.authorize(token)


app = FastAPI(title="ATLAS API", version="0.1.0")

# Allow local dev origins and any private IPv4 address for the LAN demo.
# In production this should be replaced with explicit HTTPS origins.
_PRIVATE_ORIGIN_RE = (
    r"http://("
    r"localhost|"
    r"127\.0\.0\.1|"
    r"192\.168\.\d{1,3}\.\d{1,3}|"
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
    r"):\d+"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_origin_regex=_PRIVATE_ORIGIN_RE,
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
        extraction_mode="adapter" if model_files["extraction-adapter"] else "base",
    )


def extraction_for_mobile(extracted: dict) -> P2PExtractionResponse:
    equipment = extracted.get("equipment", [])
    equipments = [
        {
            "modality": item.get("modality") or "OTHER",
            "brand": item.get("brand"),
            "model": item.get("model"),
            "ageYears": item.get("age_years"),
            "quantity": item.get("quantity") or 1,
            "confidence": item.get("confidence") or 0,
            "status": item.get("status") or "Desconocido",
        }
        for item in equipment
    ]
    confidence = (
        sum(item["confidence"] for item in equipments) / len(equipments)
        if equipments
        else 0
    )
    return P2PExtractionResponse(
        equipments=equipments,
        missing_fields=extracted.get("missing_fields", []),
        next_question=extracted.get("next_question"),
        confidence=confidence,
    )


@app.post("/api/p2p/pair", response_model=P2PPairResponse)
async def pair_p2p(request: P2PPairRequest) -> P2PPairResponse:
    token, expires_at = pairing_manager.pair(request.code)
    logger.info("P2P provider paired with mobile device %s", request.device_name)
    return P2PPairResponse(
        token=token,
        expires_at=expires_at.isoformat(),
        capabilities=["extract", "transcribe"],
    )


@app.post("/api/p2p/invite", response_model=P2PInvitationResponse)
async def create_invitation(request: P2PInvitationCreate) -> P2PInvitationResponse:
    code, invite = pairing_manager.create_invitation(request.local_url)
    invite_url = f"{request.local_url.rstrip('/')}/pair/{code}"
    logger.info("P2P invitation created")
    return P2PInvitationResponse(
        code=code,
        invite_url=invite_url,
        expires_at=invite["expires_at"],
    )


@app.post("/api/p2p/invite/consume", response_model=dict)
async def consume_invitation(request: P2PInvitationConsume) -> dict:
    invite = pairing_manager.consume_invitation(request.code)
    if not invite:
        raise HTTPException(status_code=401, detail="Invitación inválida, usada o expirada.")
    return {
        "local_url": invite["local_url"],
        "code": invite["code"],
    }


@app.post("/api/p2p/extract", response_model=P2PExtractionResponse)
async def p2p_extract(
    request: P2PExtractRequest,
    _: Annotated[None, Depends(authorize_p2p)],
    runtime: Annotated[QvacRuntime, Depends(get_qvac_runtime)],
) -> P2PExtractionResponse:
    require_models("qwen3-0.6b")
    try:
        return extraction_for_mobile(runtime.run("extract", text=request.text))
    except Exception as error:
        logger.exception("P2P extraction failed")
        raise HTTPException(status_code=500, detail="La extracción P2P falló.") from error


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


IMAGE_SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_PHOTO_BYTES = 15 * 1024 * 1024


@app.post("/api/capture/analyze-photo", response_model=ExtractResponse)
async def analyze_photo(
    file: Annotated[UploadFile, File(...)],
    photo_authorized: Annotated[bool, Form(...)],
    text: Annotated[str, Form()] = "",
    client: Annotated[str | None, Form()] = None,
    city: Annotated[str | None, Form()] = None,
    country: Annotated[str | None, Form()] = None,
    pipeline: Annotated[CapturePipeline, Depends(get_capture_pipeline)] = None,
) -> ExtractResponse:
    if not photo_authorized:
        raise HTTPException(
            status_code=403,
            detail="Debes confirmar que la foto está autorizada antes de analizarla.",
        )
    suffix = IMAGE_SUFFIXES.get(file.content_type or "")
    if not suffix:
        raise HTTPException(status_code=415, detail="Formato de foto no permitido.")
    content = await file.read()
    if not content or len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="La foto debe pesar entre 1 byte y 15 MB.")
    require_models("visionpsy-nano", "visionpsy-mmproj")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        draft = pipeline.prepare(text=text, image_path=tmp_path, observer="web-user")
        draft.client = client or None
        draft.city = city or None
        draft.country = country or None
        return ExtractResponse(
            draft=draft.model_dump(mode="json"),
            missing_fields=draft.missing_fields,
            next_question=draft.next_question,
        )
    except Exception as error:
        logger.exception("Local photo analysis failed")
        raise HTTPException(
            status_code=500,
            detail="El análisis local de la foto falló. Revisa el runtime QVAC.",
        ) from error
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


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


@app.post("/api/p2p/transcribe", response_model=TranscribeResponse)
async def p2p_transcribe(
    file: Annotated[UploadFile, File(...)],
    _: Annotated[None, Depends(authorize_p2p)],
    runtime: Annotated[QvacRuntime, Depends(get_qvac_runtime)],
) -> TranscribeResponse:
    require_models("whisper-small", "silero-vad")
    content = await file.read()
    if not content or len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El audio debe pesar entre 1 byte y 20 MB.")
    suffix = audio_suffix_for_runtime(file.filename)
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = runtime.run("transcribe", audio=tmp_path)
        return TranscribeResponse(text=result.get("text", ""))
    except Exception as error:
        logger.exception("P2P transcription failed")
        raise HTTPException(status_code=500, detail="La transcripción P2P falló.") from error
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


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
