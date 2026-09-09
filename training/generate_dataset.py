# ruff: noqa: E501
"""Generate deterministic, leakage-resistant SFT data for ATLAS extraction."""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "finetuning"
CURRENT_YEAR = 2026

SYSTEM_PROMPT = """You extract installed medical-equipment observations.
Return only evidence supported by the user's note or authorized photo.
Never guess a customer, location, quantity, manufacturer, model, serial number, or age.
Use null for unknown values. Preserve separate equipment groups when ages, models, or brands differ.
Before human review, use Reportado for explicit observations, Estimado for approximations,
and Desconocido when support is insufficient. Never mark model output as Confirmado.
Ask exactly one concise follow-up question for the missing field with the highest business value.
If a person, patient record, badge, face, or unrelated sensitive content is visible, add a privacy flag."""


@dataclass(frozen=True)
class Site:
    client: str
    city: str
    country: str


@dataclass(frozen=True)
class Product:
    modality: str
    spoken_es: str
    spoken_en: str
    spoken_pt: str
    brand: str
    model: str


SITES = [
    Site("Hospital Costa Azul", "Panama City", "Panama"),
    Site("Clinica Valle Norte", "David", "Panama"),
    Site("Centro Medico Horizonte", "San Jose", "Costa Rica"),
    Site("Hospital Santa Elena", "Bogota", "Colombia"),
    Site("Instituto Medico del Pacifico", "Guayaquil", "Ecuador"),
    Site("Clinica Nueva Esperanza", "Lima", "Peru"),
    Site("Hospital Rio Claro", "Campinas", "Brazil"),
    Site("Centro Clinico Aurora", "Sao Paulo", "Brazil"),
    Site("Starlight Regional Hospital", "Austin", "United States"),
    Site("North River Medical Center", "Toronto", "Canada"),
    Site("Hopital Bellevue", "Montreal", "Canada"),
    Site("Clinica Puerto Sur", "Santo Domingo", "Dominican Republic"),
]

PRODUCTS = [
    Product("CT", "tomografo", "CT scanner", "tomografo", "Aster Medical", "Aquila CT 64"),
    Product("MR", "resonador", "MRI system", "ressonancia", "Nova Imaging", "Magna 1.5T"),
    Product(
        "Ultrasound", "ecografo", "ultrasound system", "ultrassom", "Helix Health", "EchoWave 7"
    ),
    Product(
        "X-Ray",
        "equipo de rayos X",
        "X-ray system",
        "equipamento de raios X",
        "Lumina Systems",
        "Radia DR",
    ),
    Product(
        "Patient Monitoring",
        "monitor de pacientes",
        "patient monitor",
        "monitor de pacientes",
        "Vitalis",
        "VM-800",
    ),
    Product(
        "Mammography",
        "mamografo",
        "mammography system",
        "mamografo",
        "Clarity Medical",
        "MammoView S",
    ),
    Product(
        "Mobile C-arm",
        "arco en C movil",
        "mobile C-arm",
        "arco cirurgico movel",
        "SurgiVision",
        "ArcOne",
    ),
    Product(
        "PET-CT",
        "equipo PET-CT",
        "PET-CT system",
        "equipamento PET-CT",
        "Quantum Diagnostics",
        "Fusion PET 5",
    ),
]

COUNTS_ES = {1: "un", 2: "dos", 3: "tres", 4: "cuatro"}
COUNTS_EN = {1: "one", 2: "two", 3: "three", 4: "four"}
COUNTS_PT = {1: "um", 2: "dois", 3: "tres", 4: "quatro"}


def missing_fields(
    client: str | None, city: str | None, country: str | None, equipment: list[dict[str, Any]]
) -> list[str]:
    missing: list[str] = []
    if client is None:
        missing.append("client")
    if country is None:
        missing.append("country")
    if city is None:
        missing.append("city")
    for index, item in enumerate(equipment):
        if item["modality"] is None:
            missing.append(f"equipment[{index}].modality")
        if item["quantity"] is None:
            missing.append(f"equipment[{index}].quantity")
        if item["serial_number"] is None:
            missing.append(f"equipment[{index}].serial_number")
        if item["brand"] is None:
            missing.append(f"equipment[{index}].brand")
        if item["model"] is None:
            missing.append(f"equipment[{index}].model")
        if item["age_years"] is None and item["installation_year"] is None:
            missing.append(f"equipment[{index}].age_years")
    return missing


def next_question(missing: list[str], equipment: list[dict[str, Any]], language: str) -> str | None:
    if not missing:
        return None
    questions = {
        "es": {
            "client": "¿Que hospital o cliente visitaste?",
            "country": "¿En que pais se encuentra el cliente?",
            "city": "¿En que ciudad se encuentra el cliente?",
            "equipment": "¿Que equipos observaste durante la visita?",
            "modality": "¿Que tipo de equipo observaste?",
            "quantity": "¿Cuantas unidades observaste?",
            "serial_number": "¿Puedes confirmar el numero de serie o fotografiar la placa?",
            "brand": "¿Conoces el fabricante del equipo?",
            "model": "¿Puedes identificar el modelo o la familia del producto?",
            "age": "¿Que antiguedad aproximada tiene el equipo?",
        },
        "en": {
            "client": "Which hospital or customer did you visit?",
            "country": "Which country is the customer in?",
            "city": "Which city is the customer in?",
            "equipment": "Which equipment did you observe during the visit?",
            "modality": "What type of equipment did you observe?",
            "quantity": "How many units did you observe?",
            "serial_number": "Can you confirm the serial number or photograph the label?",
            "brand": "Do you know the equipment manufacturer?",
            "model": "Can you identify the model or product family?",
            "age": "What is the equipment's approximate age?",
        },
        "pt": {
            "client": "Qual hospital ou cliente voce visitou?",
            "country": "Em qual pais o cliente esta localizado?",
            "city": "Em qual cidade o cliente esta localizado?",
            "equipment": "Quais equipamentos voce observou durante a visita?",
            "modality": "Que tipo de equipamento voce observou?",
            "quantity": "Quantas unidades voce observou?",
            "serial_number": "Pode confirmar o numero de serie ou fotografar a placa?",
            "brand": "Voce conhece o fabricante do equipamento?",
            "model": "Pode identificar o modelo ou a familia do produto?",
            "age": "Qual e a idade aproximada do equipamento?",
        },
    }[language]
    priorities = [
        "client",
        "equipment",
        "modality",
        "country",
        "city",
        "quantity",
        "serial_number",
        "brand",
        "model",
        "age",
    ]
    for field in priorities:
        if field == "equipment" and not equipment:
            return questions[field]
        for value in missing:
            suffix = value.rsplit(".", 1)[-1]
            if field == "age" and suffix == "age_years":
                return questions[field]
            if value == field or suffix == field:
                return questions[field]
    return questions["equipment"]


def equipment_item(
    product: Product,
    note: str,
    *,
    quantity: int | None,
    brand: str | None,
    model: str | None,
    serial: str | None,
    age: float | None,
    year: int | None,
    estimated: bool = False,
) -> dict[str, Any]:
    return {
        "modality": product.modality,
        "quantity": quantity,
        "brand": brand,
        "model": model,
        "age_years": age,
        "status": "Estimado" if estimated else "Reportado",
        "serial_number": serial,
        "installation_year": year,
        "confidence": None,
        "evidence_text": note,
        "notes": None,
    }


def make_case(index: int, split_offset: int) -> dict[str, Any]:
    rng = random.Random(41021 + split_offset + index * 7919)
    site = SITES[(index * 5 + split_offset) % len(SITES)]
    product = PRODUCTS[(index * 3 + split_offset) % len(PRODUCTS)]
    second = PRODUCTS[(index * 3 + split_offset + 3) % len(PRODUCTS)]
    language = ("es", "en", "pt")[(index + split_offset) % 3]
    scenario = index % 10
    quantity = 1 + rng.randrange(4)
    age = 2 + rng.randrange(14)
    year = CURRENT_YEAR - age
    serial = f"{product.brand[:2].upper()}-{year}-{1000 + index + split_offset}"
    client: str | None = site.client
    city: str | None = site.city
    country: str | None = site.country
    equipment: list[dict[str, Any]] = []
    privacy_flags: list[str] = []

    if language == "es":
        if scenario == 0:
            note = f"Visite {site.client} en {site.city}, {site.country}. Vi {COUNTS_ES[quantity]} {product.spoken_es} {product.brand} modelo {product.model}, instalados en {year}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=year,
                )
            ]
        elif scenario == 1:
            note = f"En {site.client}, {site.city}, observe {COUNTS_ES[quantity]} {product.spoken_es}. No pude confirmar marca, modelo ni antiguedad."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 2:
            note = f"Estoy en {site.client}, {site.country}. Hay un {product.spoken_es} {product.brand} {product.model} que parece tener unos {age} anos."
            city = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 3:
            note = f"En {site.client} de {site.city}, {site.country}, la placa del {product.spoken_es} indica {product.brand}, {product.model}, serie {serial}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 4:
            note = f"Visita a {site.client} en {site.city}, {site.country}: {COUNTS_ES[quantity]} {product.spoken_es} {product.brand} {product.model} y dos {second.spoken_es} sin marca visible."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                ),
                equipment_item(
                    second,
                    note,
                    quantity=2,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                ),
            ]
        elif scenario == 5:
            note = f"Pensaba que el equipo era {second.brand}, pero revise la placa: es un {product.spoken_es} {product.brand} {product.model}, serie {serial}, en {site.client}, {site.city}, {site.country}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 6:
            note = f"En {site.client}, {site.city}, {site.country}, reportaron {COUNTS_ES[quantity]} {product.spoken_es}; no tuve acceso al area para verificar fabricante, modelo o edad."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 7:
            note = f"Observe un {product.spoken_es} {product.brand} {product.model} de aproximadamente {age} anos en {site.client}. No anote la ubicacion."
            city = None
            country = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 8:
            note = f"La foto autorizada en {site.client}, {site.city}, {site.country}, muestra un {product.spoken_es} {product.brand} {product.model}; tambien aparece parcialmente el gafete de un empleado."
            privacy_flags = ["employee_badge_visible"]
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        else:
            note = f"Termine la visita en {site.client}, {site.city}, {site.country}, pero hoy no pude observar ningun equipo."
            equipment = []
    elif language == "en":
        if scenario == 0:
            note = f"At {site.client} in {site.city}, {site.country}, I observed {COUNTS_EN[quantity]} {product.spoken_en} units from {product.brand}, model {product.model}, installed in {year}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=year,
                )
            ]
        elif scenario == 1:
            note = f"I saw {COUNTS_EN[quantity]} {product.spoken_en} units at {site.client}, {site.city}. I could not identify the manufacturer, model, or age."
            country = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 2:
            note = f"There is one {product.brand} {product.model} {product.spoken_en} at {site.client} in {site.country}; it looks roughly {age} years old."
            city = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 3:
            note = f"The {product.spoken_en} label at {site.client}, {site.city}, {site.country} reads {product.brand} {product.model}, serial {serial}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 4:
            note = f"Visit to {site.client}, {site.city}, {site.country}: {COUNTS_EN[quantity]} {product.brand} {product.model} {product.spoken_en} units and two {second.spoken_en} units with no visible brand."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                ),
                equipment_item(
                    second,
                    note,
                    quantity=2,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                ),
            ]
        elif scenario == 5:
            note = f"I first thought it was made by {second.brand}, but the label confirms a {product.brand} {product.model} {product.spoken_en}, serial {serial}, at {site.client} in {site.city}, {site.country}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 6:
            note = f"Staff at {site.client} in {site.city}, {site.country} reported {COUNTS_EN[quantity]} {product.spoken_en} units. I did not access the room, so brand, model, and age remain unknown."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 7:
            note = f"I observed one {product.brand} {product.model} {product.spoken_en}, about {age} years old, at {site.client}. I did not record its location."
            city = None
            country = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 8:
            note = f"The authorized photo from {site.client}, {site.city}, {site.country} shows a {product.brand} {product.model} {product.spoken_en}; an employee badge is partly visible."
            privacy_flags = ["employee_badge_visible"]
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        else:
            note = f"I completed the visit at {site.client} in {site.city}, {site.country}, but did not observe any equipment today."
            equipment = []
    else:
        if scenario == 0:
            note = f"No {site.client}, em {site.city}, {site.country}, observei {COUNTS_PT[quantity]} unidades de {product.spoken_pt} {product.brand}, modelo {product.model}, instaladas em {year}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=year,
                )
            ]
        elif scenario == 1:
            note = f"Vi {COUNTS_PT[quantity]} unidades de {product.spoken_pt} no {site.client}, em {site.city}. Nao identifiquei fabricante, modelo ou idade."
            country = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 2:
            note = f"Ha um {product.spoken_pt} {product.brand} {product.model} no {site.client}, {site.country}; parece ter aproximadamente {age} anos."
            city = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 3:
            note = f"A placa do {product.spoken_pt} no {site.client}, em {site.city}, {site.country}, mostra {product.brand} {product.model}, serie {serial}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 4:
            note = f"Visita ao {site.client}, {site.city}, {site.country}: {COUNTS_PT[quantity]} unidades de {product.spoken_pt} {product.brand} {product.model} e dois {second.spoken_pt} sem marca visivel."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                ),
                equipment_item(
                    second,
                    note,
                    quantity=2,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                ),
            ]
        elif scenario == 5:
            note = f"Achei que fosse {second.brand}, mas a placa confirma um {product.spoken_pt} {product.brand} {product.model}, serie {serial}, no {site.client}, {site.city}, {site.country}."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=serial,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 6:
            note = f"A equipe do {site.client}, em {site.city}, {site.country}, informou {COUNTS_PT[quantity]} unidades de {product.spoken_pt}. Nao acessei a sala; fabricante, modelo e idade sao desconhecidos."
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=quantity,
                    brand=None,
                    model=None,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        elif scenario == 7:
            note = f"Observei um {product.spoken_pt} {product.brand} {product.model}, com cerca de {age} anos, no {site.client}. Nao registrei a localizacao."
            city = None
            country = None
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=float(age),
                    year=None,
                    estimated=True,
                )
            ]
        elif scenario == 8:
            note = f"A foto autorizada do {site.client}, {site.city}, {site.country}, mostra um {product.spoken_pt} {product.brand} {product.model}; o cracha de um funcionario aparece parcialmente."
            privacy_flags = ["employee_badge_visible"]
            equipment = [
                equipment_item(
                    product,
                    note,
                    quantity=1,
                    brand=product.brand,
                    model=product.model,
                    serial=None,
                    age=None,
                    year=None,
                )
            ]
        else:
            note = f"Conclui a visita ao {site.client}, em {site.city}, {site.country}, mas nao observei nenhum equipamento hoje."
            equipment = []

    capture_ref = f"WO-{split_offset + index:05d}"
    if language == "es":
        note = f"{note} Orden de visita {capture_ref}."
    elif language == "en":
        note = f"{note} Field visit {capture_ref}."
    else:
        note = f"{note} Ordem de visita {capture_ref}."

    missing = missing_fields(client, city, country, equipment)
    if not equipment:
        missing.append("equipment")
    output = {
        "client": client,
        "city": city,
        "country": country,
        "equipment": equipment,
        "missing_fields": missing,
        "next_question": next_question(missing, equipment, language),
        "input_language": {"es": "Spanish", "en": "English", "pt": "Portuguese"}[language],
        "privacy_flags": privacy_flags,
    }
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"/no_think\n{note}"},
            {
                "role": "assistant",
                "content": json.dumps(output, ensure_ascii=False, separators=(",", ":")),
            },
        ]
    }


def write_split(name: str, count: int, offset: int) -> None:
    path = DATA_DIR / f"{name}.jsonl"
    examples = [make_case(index, offset) for index in range(count)]
    path.write_text(
        "\n".join(
            json.dumps(example, ensure_ascii=False, separators=(",", ":")) for example in examples
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_split("train", 60, 0)
    write_split("validation", 12, 10_000)
    write_split("test", 36, 20_000)
    manifest = {
        "format": "QVAC SFT JSONL",
        "generated_by": "training/generate_dataset.py",
        "seed": 41021,
        "splits": {"train": 60, "validation": 12, "test": 36},
        "languages": ["Spanish", "English", "Portuguese"],
        "purpose": "Installed-base observation extraction and uncertainty handling",
        "synthetic": True,
    }
    (DATA_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Generated 60 train, 12 validation, and 36 held-out test examples.")


if __name__ == "__main__":
    main()
