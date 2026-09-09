"""Developer CLI for the ATLAS local product core."""

from __future__ import annotations

import argparse
import json

from atlas.application.capture import CaptureService
from atlas.application.inventory import aggregate_inventory
from atlas.application.renewal import evaluate_opportunities
from atlas.application.search import InventorySearchService
from atlas.infrastructure.database.sqlite import SQLiteDatabase
from atlas.infrastructure.qvac.embeddings import EmbeddingService
from atlas.infrastructure.qvac.pipeline import CapturePipeline
from atlas.infrastructure.qvac.runtime import QvacRuntime
from atlas.infrastructure.repositories.observations import ObservationRepository


def command_init(database: SQLiteDatabase) -> dict[str, object]:
    database.initialize()
    return {"database": str(database.path), "initialized": True}


def command_seed(database: SQLiteDatabase) -> dict[str, object]:
    database.initialize()
    return {"database": str(database.path), "inserted": database.seed_from_csv()}


def command_summary(database: SQLiteDatabase) -> dict[str, object]:
    repository = ObservationRepository(database)
    assets = repository.list_assets()
    return {
        "inventory": aggregate_inventory(assets),
        "customers": repository.customer_summary(),
        "opportunities": [
            opportunity.model_dump(mode="json")
            for asset in assets
            for opportunity in evaluate_opportunities(asset)
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(prog="atlas", description="ATLAS local product core")
    parser.add_argument(
        "command",
        choices=["init", "seed", "capture", "search", "summary", "qvac-health"],
    )
    parser.add_argument("--database", default=None)
    parser.add_argument("--text", help="Field observation for local extraction")
    parser.add_argument("--question", help="Natural-language inventory query")
    parser.add_argument("--observer", default="local-user")
    parser.add_argument("--confirm", action="store_true")
    arguments = parser.parse_args()
    database = SQLiteDatabase(arguments.database) if arguments.database else SQLiteDatabase()

    if arguments.command == "init":
        result = command_init(database)
    elif arguments.command == "seed":
        result = command_seed(database)
    elif arguments.command == "summary":
        result = command_summary(database)
    elif arguments.command == "capture":
        if not arguments.text:
            parser.error("capture requires --text")
        database.initialize()
        draft = CapturePipeline().prepare(
            text=arguments.text,
            observer=arguments.observer,
        )
        if arguments.confirm:
            result = CaptureService(
                ObservationRepository(database),
                embeddings=EmbeddingService(),
            ).confirm(
                draft,
                actor=arguments.observer,
            ).model_dump(mode="json")
        else:
            result = draft.model_dump(mode="json")
    elif arguments.command == "search":
        if not arguments.question:
            parser.error("search requires --question")
        database.initialize()
        result = {
            "question": arguments.question,
            "results": InventorySearchService(ObservationRepository(database)).search(
                arguments.question
            ),
        }
    else:
        result = QvacRuntime().health()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
