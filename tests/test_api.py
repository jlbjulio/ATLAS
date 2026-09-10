from pathlib import Path

from fastapi.testclient import TestClient

from atlas.infrastructure.database.sqlite import SQLiteDatabase
from web.server import main as api_server
from web.server.main import app, get_capture_pipeline, get_database, get_qvac_runtime


def test_api_returns_seeded_inventory(tmp_path: Path) -> None:
    database = SQLiteDatabase(tmp_path / "atlas.db")
    database.initialize()
    database.seed_from_csv()
    app.dependency_overrides[get_database] = lambda: database

    try:
        client = TestClient(app)
        installed_base = client.get("/api/installed-base")
        dashboard = client.get("/api/dashboard")

        assert installed_base.status_code == 200
        assert len(installed_base.json()) == 13
        assert installed_base.json()[0]["assets"]

        assert dashboard.status_code == 200
        payload = dashboard.json()
        assert payload["total_equipment"] == 20
        assert payload["total_clients"] == 13
        assert payload["by_modality"]
        assert payload["status_counts"]
    finally:
        app.dependency_overrides.clear()


def test_health_reports_configured_local_models() -> None:
    response = TestClient(app).get("/api/health")

    assert response.status_code == 200
    assert response.json()["local_only"] is True
    assert "qwen3-0.6b" in response.json()["models_exist"]
    assert "silero-vad" in response.json()["models_exist"]
    assert response.json()["extraction_mode"] in {"base", "adapter"}


def test_photo_analysis_requires_explicit_authorization() -> None:
    response = TestClient(app).post(
        "/api/capture/analyze-photo",
        data={"photo_authorized": "false"},
        files={"file": ("plate.jpg", b"image", "image/jpeg")},
    )

    assert response.status_code == 403


def test_confirmation_rejects_sensitive_content() -> None:
    response = TestClient(app).post(
        "/api/capture/confirm",
        json={"privacy_flags": ["face_detected"]},
    )

    assert response.status_code == 400
    assert "sensitive visual content" in response.json()["detail"]


def test_photo_analysis_uses_local_pipeline(tmp_path: Path) -> None:
    class FakePipeline:
        def prepare(self, **kwargs):
            from atlas.domain.observations import Evidence, EvidenceKind, ObservationDraft

            assert Path(kwargs["image_path"]).suffix == ".jpg"
            return ObservationDraft(
                raw_text=kwargs["text"],
                evidence=[Evidence(kind=EvidenceKind.PHOTO, local_path=tmp_path / "photo.jpg")],
            )

    app.dependency_overrides[get_capture_pipeline] = lambda: FakePipeline()
    try:
        response = TestClient(app).post(
            "/api/capture/analyze-photo",
            data={
                "photo_authorized": "true",
                "text": "Placa autorizada",
                "client": "Hospital Demo",
                "city": "Panamá",
                "country": "Panamá",
            },
            files={"file": ("plate.jpg", b"image", "image/jpeg")},
        )
        assert response.status_code == 200
        draft = response.json()["draft"]
        assert draft["client"] == "Hospital Demo"
        assert draft["evidence"][0]["kind"] == "photo"
    finally:
        app.dependency_overrides.clear()


def test_search_reports_unavailable_local_model(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(
        api_server,
        "get_model_files",
        lambda: {"qwen3-0.6b": tmp_path / "missing-qwen.gguf"},
    )

    response = TestClient(app).post("/api/search", json={"question": "Tomógrafos en Panamá"})

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "local_models_unavailable"
    assert response.json()["detail"]["missing_models"] == ["qwen3-0.6b"]


def test_transcription_reports_unavailable_local_model(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(
        api_server,
        "get_model_files",
        lambda: {
            "whisper-small": tmp_path / "missing-whisper.bin",
            "silero-vad": tmp_path / "missing-vad.bin",
        },
    )

    response = TestClient(app).post(
        "/api/capture/transcribe",
        files={"file": ("recording.webm", b"audio", "audio/webm")},
    )

    assert response.status_code == 503
    assert response.json()["detail"]["missing_models"] == ["whisper-small", "silero-vad"]


def _transcribe_with_runtime(runtime, filename: str, payload: bytes) -> dict:
    app.dependency_overrides[get_qvac_runtime] = lambda: runtime
    try:
        response = TestClient(app).post(
            "/api/capture/transcribe",
            files={"file": (filename, payload, "audio/webm")},
        )
        assert response.status_code == 200
        return runtime.calls[0]
    finally:
        app.dependency_overrides.clear()


def test_transcription_rewrites_webm_to_decodable_ogg(tmp_path: Path) -> None:
    class FakeRuntime:
        calls: list[dict] = []

        def run(self, command: str, **options) -> dict:
            self.calls.append({"command": command, **options})
            return {"text": "transcripción"}

    call = _transcribe_with_runtime(FakeRuntime(), "recording.webm", b"fake-webm-bytes")

    assert call["command"] == "transcribe"
    assert Path(call["audio"]).suffix == ".ogg"


def test_transcription_keeps_known_wav_suffix(tmp_path: Path) -> None:
    class FakeRuntime:
        calls: list[dict] = []

        def run(self, command: str, **options) -> dict:
            self.calls.append({"command": command, **options})
            return {"text": "transcripción"}

    call = _transcribe_with_runtime(FakeRuntime(), "recording.wav", b"RIFF")

    assert Path(call["audio"]).suffix == ".wav"
