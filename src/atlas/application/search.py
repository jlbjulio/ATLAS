"""Safe inventory filters produced by local natural-language extraction."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from atlas.infrastructure.qvac.runtime import QvacRuntime
from atlas.infrastructure.repositories.observations import ObservationRepository


class InventoryFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer: str | None = None
    country: str | None = None
    city: str | None = None
    modality: str | None = None
    brand: str | None = None
    minimum_age_years: float | None = Field(default=None, ge=0)
    maximum_age_years: float | None = Field(default=None, ge=0)
    status: str | None = None
    stale_only: bool = False
    limit: int = Field(default=100, ge=1, le=500)


def compile_filters(filters: InventoryFilters) -> tuple[str, list[object]]:
    """Compile an allow-listed filter object; model-generated SQL is never executed."""

    clauses: list[str] = []
    values: list[object] = []
    mappings = {
        "customer": "c.name",
        "country": "c.country",
        "city": "c.city",
        "modality": "a.modality",
        "brand": "a.brand",
        "status": "a.status",
    }
    for field, column in mappings.items():
        value = getattr(filters, field)
        if value:
            clauses.append(f"LOWER({column}) LIKE LOWER(?)")
            values.append(f"%{value}%")
    if filters.minimum_age_years is not None:
        clauses.append("a.age_years >= ?")
        values.append(filters.minimum_age_years)
    if filters.maximum_age_years is not None:
        clauses.append("a.age_years <= ?")
        values.append(filters.maximum_age_years)
    if filters.stale_only:
        clauses.append("date(a.last_seen) < date('now', '-365 day')")

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"""
        SELECT a.*, c.name AS customer_name, c.city, c.country
        FROM assets AS a
        JOIN customers AS c ON c.id = a.customer_id
        {where}
        ORDER BY a.last_seen DESC
        LIMIT ?
    """
    values.append(filters.limit)
    return sql, values


class InventorySearchService:
    def __init__(
        self,
        repository: ObservationRepository,
        runtime: QvacRuntime | None = None,
    ) -> None:
        self.repository = repository
        self.runtime = runtime or QvacRuntime()

    def search(self, question: str) -> list[dict[str, object]]:
        extracted = self.runtime.run("query", text=question)
        filters = InventoryFilters.model_validate(extracted)
        sql, values = compile_filters(filters)
        return self.repository.raw_query(sql, values)
