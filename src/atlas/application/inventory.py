"""Inventory aggregation for customer and territory intelligence."""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable

from atlas.domain.equipment import InstalledAsset


def aggregate_inventory(assets: Iterable[InstalledAsset]) -> dict[str, object]:
    materialized = list(assets)
    return {
        "asset_records": len(materialized),
        "reported_units": sum(asset.quantity or 0 for asset in materialized),
        "by_modality": dict(Counter(asset.modality or "Unknown" for asset in materialized)),
        "by_brand": dict(Counter(asset.brand or "Unknown" for asset in materialized)),
        "average_confidence": round(
            sum(asset.confidence or 0 for asset in materialized) / len(materialized), 4
        )
        if materialized
        else 0.0,
    }
