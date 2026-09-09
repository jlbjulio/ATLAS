from datetime import date

from atlas.application.capture import CaptureService
from atlas.domain.equipment import CaptureSource, EquipmentCandidate, ObservationStatus
from atlas.domain.observations import ObservationDraft
from atlas.infrastructure.audit.ledger import verify_audit_chain
from atlas.infrastructure.database.sqlite import DEFAULT_SEED_PATH, SQLiteDatabase
from atlas.infrastructure.repositories.observations import ObservationRepository


def test_seed_is_correct_and_idempotent(tmp_path) -> None:
    database = SQLiteDatabase(tmp_path / "atlas.db")
    database.initialize()
    first = database.seed_from_csv(DEFAULT_SEED_PATH)
    second = database.seed_from_csv(DEFAULT_SEED_PATH)

    assert first == {"customers": 13, "observations": 20, "assets": 20}
    assert second == {"customers": 0, "observations": 0, "assets": 0}

    with database.connect() as connection:
        statuses = {
            row["status"]
            for row in connection.execute("SELECT DISTINCT status FROM assets").fetchall()
        }
        assert statuses <= {"Confirmado", "Reportado", "Estimado", "Desconocido"}
        assert connection.execute("SELECT COUNT(*) FROM assets").fetchone()[0] == 20


def test_confirmed_capture_creates_asset_audit_and_outbox(tmp_path) -> None:
    database = SQLiteDatabase(tmp_path / "atlas.db")
    database.initialize()
    repository = ObservationRepository(database)
    service = CaptureService(repository)
    draft = ObservationDraft(
        client="Hospital Demo",
        city="Panama City",
        country="Panama",
        observer="Field User",
        visit_date=date(2026, 9, 9),
        source=CaptureSource.TEXT,
        raw_text="One CT, NovaMed, model CT-500, approximately eight years old.",
        equipment=[
            EquipmentCandidate(
                modality="CT",
                quantity=1,
                brand="NovaMed",
                model="CT-500",
                age_years=8,
                status=ObservationStatus.ESTIMATED,
                evidence_text="approximately eight years old",
            )
        ],
    )

    result = service.confirm(draft, actor="Field User")
    assert len(result.asset_ids) == 1

    with database.connect() as connection:
        assert connection.execute("SELECT COUNT(*) FROM observations").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM assets").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM audit_events").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM sync_outbox").fetchone()[0] == 1
        assert verify_audit_chain(connection)
