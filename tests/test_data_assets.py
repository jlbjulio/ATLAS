import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def test_finetuning_splits_are_valid() -> None:
    directory = ROOT / "data" / "finetuning"
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    seen_prompts: set[str] = set()

    for filename in manifest["splits"].values():
        rows = load_jsonl(directory / filename)
        assert rows
        for row in rows:
            messages = row["messages"]
            assert [message["role"] for message in messages] == ["system", "user", "assistant"]
            assert messages[1]["content"] not in seen_prompts
            seen_prompts.add(messages[1]["content"])
            output = json.loads(messages[2]["content"])
            assert set(output) == {
                "client",
                "city",
                "country",
                "equipment",
                "missing_fields",
                "next_question",
            }


def test_observation_schema_is_valid_json() -> None:
    schema = json.loads(
        (ROOT / "schemas" / "installed-base-observation.schema.json").read_text(encoding="utf-8")
    )
    assert schema["type"] == "object"
    assert schema["additionalProperties"] is False


def test_inference_is_restricted_to_local_qvac() -> None:
    config = json.loads((ROOT / "config" / "models.json").read_text(encoding="utf-8"))
    assert config["runtime"] == {
        "provider": "qvac",
        "inference_mode": "local",
        "allow_cloud_inference": False,
    }

    for model in config["models"].values():
        for key, value in model.items():
            if isinstance(value, str) and (key.endswith("path") or key in {"euro", "afri"}):
                assert "://" not in value
                assert not Path(value).is_absolute()
