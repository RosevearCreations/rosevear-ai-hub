import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import (
    HomeAssistantRuntime,
    get_home_assistant_runtime,
)
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AppSetting, AuditEvent, Automation, Base
from rosevear_ai_hub.providers.base import (
    AIProvider,
    ProviderDescriptor,
    ProviderHealth,
)
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry


def _draft_definition(arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "trigger": {
            "type": "state_change",
            "entity_id": "binary_sensor.workshop_motion",
            "to_state": "on",
        },
        "conditions": [
            {
                "type": "state_equals",
                "entity_id": "input_boolean.workshop_occupied",
                "state": "on",
            }
        ],
        "actions": [
            {
                "type": "tool",
                "tool_key": "home_assistant.light.set",
                "arguments": arguments
                if arguments is not None
                else {"entity_id": "light.workshop", "state": "on"},
            }
        ],
        "cooldown_seconds": 30,
        "deduplication_key": "workshop.motion.light",
    }


class DraftProvider(AIProvider):
    _descriptor = ProviderDescriptor(
        key="fake-local",
        display_name="Fake Local",
        provider_type="local",
        privacy_policy="local_only",
        supports_streaming=True,
        supports_tools=False,
        enabled=True,
    )

    def __init__(self, *, arguments: dict[str, Any] | None = None) -> None:
        self.calls = 0
        self.messages: list[dict[str, str]] = []
        self.arguments = arguments

    @property
    def descriptor(self) -> ProviderDescriptor:
        return self._descriptor

    async def health(self) -> ProviderHealth:
        return ProviderHealth(
            available=True,
            message="Fake provider available.",
            version="test",
            model_count=1,
        )

    async def models(self) -> list[dict[str, Any]]:
        return [{"name": "tiny:latest"}]

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        self.calls += 1
        self.messages = messages
        assert model == "tiny:latest"
        payload = {
            "name": "Workshop motion light",
            "definition": _draft_definition(self.arguments),
            "explanation": "Turn on the workshop light when occupied motion starts.",
            "assumptions": ["Workshop occupied must already be on."],
        }
        text = json.dumps(payload)
        yield text[: len(text) // 2]
        yield text[len(text) // 2 :]


class FakeHomeAssistantClient:
    async def states(self) -> list[dict[str, Any]]:
        return [
            {
                "entity_id": "binary_sensor.workshop_motion",
                "state": "off",
                "attributes": {"friendly_name": "Workshop motion"},
            },
            {
                "entity_id": "input_boolean.workshop_occupied",
                "state": "on",
                "attributes": {"friendly_name": "Workshop occupied"},
            },
            {
                "entity_id": "light.workshop",
                "state": "off",
                "attributes": {"friendly_name": "Workshop light"},
            },
        ]


def _build_client(tmp_path, provider: DraftProvider):
    engine = build_engine(f"sqlite:///{tmp_path / 'authoring.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    registry = ProviderRegistry(
        [provider],
        generation_attempts=2,
        retry_delay_seconds=0,
        offline_cooldown_seconds=30,
    )

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = lambda: registry
    application.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=FakeHomeAssistantClient(),
        base_url="http://homeassistant.test",
        url_configured=True,
        token_configured=True,
    )
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201
    with session_maker() as session:
        session.add(
            AppSetting(
                key="home_assistant.safe_control_allowlist",
                value_json=["light.workshop"],
            )
        )
        session.commit()
    return client, session_maker


def test_ai_draft_is_validated_but_not_persisted_before_confirmation(tmp_path) -> None:
    provider = DraftProvider()
    client, session_maker = _build_client(tmp_path, provider)
    prompt = "When workshop motion turns on and occupied is on, turn on the workshop light."

    response = client.post(
        "/api/v1/automations/author/draft",
        json={"prompt": prompt, "provider": "fake-local", "model": "tiny:latest"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["valid"] is True
    assert body["name"] == "Workshop motion light"
    assert body["recommended_enabled"] is False
    assert body["referenced_tools"] == ["home_assistant.light.set"]
    assert body["warnings"] == []
    assert body["definition"]["schema_version"] == 1
    assert provider.calls == 1
    assert provider.messages[-1] == {"role": "user", "content": prompt}
    assert "home_assistant.light.set" in provider.messages[0]["content"]
    assert "light.workshop" in provider.messages[0]["content"]

    with session_maker() as session:
        assert session.scalar(select(Automation)) is None
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "automation.authoring.drafted")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        assert event.sanitized_arguments["prompt_characters"] == len(prompt)
        assert prompt not in json.dumps(event.sanitized_arguments)

    change = {
        "operation": "create",
        "automation_id": None,
        "name": body["name"],
        "enabled": False,
        "definition": body["definition"],
    }
    pending = client.post("/api/v1/automations/confirm", json=change)
    assert pending.status_code == 201, pending.text
    confirmation_id = pending.json()["confirmation_id"]
    assert client.post(f"/api/v1/confirmations/{confirmation_id}/approve").status_code == 200
    applied = client.post(
        f"/api/v1/automations/apply?confirmation_id={confirmation_id}",
        json=change,
    )
    assert applied.status_code == 200, applied.text
    assert applied.json()["automation"]["enabled"] is False


def test_ai_draft_rejects_invalid_tool_arguments_before_human_review(tmp_path) -> None:
    provider = DraftProvider(arguments={"entity_id": "light.workshop"})
    client, session_maker = _build_client(tmp_path, provider)

    response = client.post(
        "/api/v1/automations/author/draft",
        json={
            "prompt": "Turn on the workshop light when motion starts.",
            "provider": "fake-local",
            "model": "tiny:latest",
        },
    )

    assert response.status_code == 422
    assert "invalid arguments" in response.json()["detail"]
    with session_maker() as session:
        assert session.scalar(select(Automation)) is None
        rejected = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "automation.authoring.rejected")
            .order_by(AuditEvent.id.desc())
        )
        assert rejected is not None


def test_household_user_cannot_use_ai_rule_authoring(tmp_path) -> None:
    provider = DraftProvider()
    client, _session_maker = _build_client(tmp_path, provider)
    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )

    response = client.post(
        "/api/v1/automations/author/draft",
        json={
            "prompt": "Turn on the workshop light when motion starts.",
            "provider": "fake-local",
            "model": "tiny:latest",
        },
    )

    assert response.status_code == 403
    assert provider.calls == 0
