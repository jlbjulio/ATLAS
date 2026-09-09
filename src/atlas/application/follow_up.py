"""Ask only the missing question with the highest business value."""

from __future__ import annotations

from dataclasses import dataclass

from atlas.domain.observations import ObservationDraft


@dataclass(frozen=True)
class FollowUp:
    field: str
    question: str
    priority: int
    equipment_index: int | None = None


CUSTOMER_QUESTIONS = {
    "client": (100, "¿Qué hospital o cliente visitaste?"),
    "country": (90, "¿En qué país se encuentra el cliente?"),
    "city": (85, "¿En qué ciudad se encuentra el cliente?"),
}

EQUIPMENT_QUESTIONS = {
    "modality": (95, "¿Qué tipo de equipo observaste?"),
    "quantity": (80, "¿Cuántas unidades observaste?"),
    "serial_number": (75, "¿Puedes confirmar el número de serie o fotografiar la placa?"),
    "brand": (70, "¿Conoces el fabricante del equipo?"),
    "model": (65, "¿Puedes identificar el modelo o la familia del producto?"),
    "age": (55, "¿Qué antigüedad aproximada tiene el equipo?"),
}


def select_follow_up(draft: ObservationDraft) -> FollowUp | None:
    candidates: list[FollowUp] = []
    for field, (priority, question) in CUSTOMER_QUESTIONS.items():
        if getattr(draft, field) is None:
            candidates.append(FollowUp(field, question, priority))

    if not draft.equipment:
        return FollowUp("equipment", "¿Qué equipos observaste durante la visita?", 98)

    for index, equipment in enumerate(draft.equipment):
        label = equipment.modality or f"equipo {index + 1}"
        missing = {
            "modality": equipment.modality is None,
            "quantity": equipment.quantity is None,
            "serial_number": equipment.serial_number is None,
            "brand": equipment.brand is None,
            "model": equipment.model is None,
            "age": equipment.age_years is None and equipment.installation_year is None,
        }
        for field, is_missing in missing.items():
            if is_missing:
                priority, question = EQUIPMENT_QUESTIONS[field]
                candidates.append(
                    FollowUp(field, f"Sobre {label}: {question}", priority, index)
                )

    return max(candidates, key=lambda item: item.priority, default=None)
