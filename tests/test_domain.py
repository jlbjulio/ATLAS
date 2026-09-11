from datetime import date

import pytest

from atlas.application.follow_up import select_follow_up
from atlas.application.renewal import OpportunityKind, evaluate_opportunities
from atlas.application.search import InventoryFilters, compile_filters
from atlas.domain.confidence import calculate_confidence
from atlas.domain.duplicates import assess_duplicate
from atlas.domain.equipment import (
    CaptureSource,
    EquipmentCandidate,
    InstalledAsset,
    ObservationStatus,
)
from atlas.domain.observations import ObservationDraft


def test_observation_source_accepts_lowercase_aliases() -> None:
    draft = ObservationDraft(source="text")
    assert draft.source is CaptureSource.TEXT
    assert ObservationDraft(source="Voice").source is CaptureSource.VOICE
    assert ObservationDraft(source="photo").source is CaptureSource.PHOTO


def test_follow_up_prioritizes_required_information() -> None:
    draft = ObservationDraft(
        client="Hospital Demo",
        city="Panama City",
        country=None,
        equipment=[EquipmentCandidate(modality="CT", quantity=1)],
    )
    follow_up = select_follow_up(draft)
    assert follow_up is not None
    assert follow_up.field == "country"


def test_confidence_is_explainable_and_capped_for_estimates() -> None:
    equipment = EquipmentCandidate(
        modality="MR",
        quantity=1,
        brand="NovaMed",
        model="NM-700",
        status=ObservationStatus.ESTIMATED,
        evidence_text="The label reads NM-700",
    )
    score = calculate_confidence(
        equipment,
        date(2026, 9, 9),
        has_photo=True,
        independent_confirmations=2,
        today=date(2026, 9, 9),
    )
    assert score.total <= 0.75
    assert score.completeness > 0.5
    assert score.reasons


def test_serial_match_is_duplicate_even_when_model_conflicts() -> None:
    incoming = EquipmentCandidate(
        modality="CT", brand="A", model="Model One", serial_number="SN-100"
    )
    existing = EquipmentCandidate(
        modality="CT", brand="A", model="Different", serial_number="sn 100"
    )
    result = assess_duplicate(incoming, existing, same_customer=True)
    assert result.is_candidate
    assert result.score == 1
    assert result.conflicts == ["same serial number but different model"]


def test_unrelated_equipment_does_not_create_quantity_conflict() -> None:
    incoming = EquipmentCandidate(modality="CT", quantity=1, brand="A", model="CT-1")
    existing = EquipmentCandidate(modality="MR", quantity=2, brand="B", model="MR-2")
    result = assess_duplicate(incoming, existing, same_customer=True)
    assert result.is_candidate is False
    assert result.conflicts == []


def test_renewal_output_is_a_review_not_a_sales_claim() -> None:
    asset = InstalledAsset(
        customer_id="customer",
        modality="MR",
        quantity=1,
        age_years=9,
        status=ObservationStatus.ESTIMATED,
        first_seen=date(2024, 1, 1),
        last_seen=date(2024, 1, 1),
    )
    opportunities = evaluate_opportunities(asset, today=date(2026, 9, 9))
    kinds = {item.kind for item in opportunities}
    assert OpportunityKind.RENEWAL_REVIEW in kinds
    assert OpportunityKind.DATA_REFRESH in kinds
    assert OpportunityKind.IDENTITY_VERIFICATION in kinds


def test_safe_search_never_accepts_unknown_fields() -> None:
    with pytest.raises(ValueError):
        InventoryFilters.model_validate({"drop_table": True})
    sql, values = compile_filters(InventoryFilters(country="Panama", minimum_age_years=7))
    assert sql.lstrip().startswith("SELECT")
    assert "DROP" not in sql
    assert values == ["%Panama%", 7, 100]
