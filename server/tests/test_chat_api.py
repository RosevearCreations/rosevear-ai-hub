from collections.abc import AsyncIterator
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, ChatMessage, ModelProfile
from rosevear_ai_hub.providers.base import (
    AIProvider,
    ProviderDescriptor,
    ProviderHealth,
    ProviderUnavailableError,
)
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry


class FakeStreamingProvider(AIProvider):
    _descriptor = ProviderDescriptor(
        key="fake-local",
        display_name="Fake Local",
        provider_type="local",
        privacy_policy="local_only",
        supports_streaming=True,
        supports_tools=False,
        enabled=True,
    )

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
        assert model == "tiny:latest"
        assert messages[0] == {
            "role": "system",
            "content": "Keep answers practical and local.",
        }
        assert messages[-1] == {"role": "user", "content": "Hello"}
        yield "Hello "
        yield "back"


class FlakyProvider(FakeStreamingProvider):
    def __init__(self) -> None:
        self.calls = 0

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        self.calls += 1
        if self.calls == 1:
            raise ProviderUnavailableError("temporary outage")
        yield "Recovered"


class OfflineProvider(FakeStreamingProvider):
    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        raise ProviderUnavailableError("still offline")
        yield ""


def _test_session_maker(tmp_path, filename: str):
    engine = build_engine(f"sqlite:///{tmp_path / filename}")
    Base.metadata.create_all(engine)
    return engine, sessionmaker(bind=engine, expire_on_commit=False)


def _fake_registry(provider: AIProvider | None = None, *, attempts: int = 2) -> ProviderRegistry:
    return ProviderRegistry(
        [provider or FakeStreamingProvider()],
        generation_attempts=attempts,
        retry_delay_seconds=0,
        offline_cooldown_seconds=30,
    )


def _seed_profile(session_maker, provider_key: str = "fake-local") -> None:
    with session_maker() as session:
        session.add(
            ModelProfile(
                id=1,
                slug="general",
                name="General",
                system_prompt="Keep answers practical and local.",
                preferred_provider=provider_key,
                preferred_model=None,
                privacy_policy="local_only",
                enabled=True,
                built_in=True,
            )
        )
        session.commit()


def _build_client(session_maker, registry: ProviderRegistry) -> TestClient:
    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = lambda: registry
    return TestClient(application)


def test_conversation_stream_profile_provider_and_message_persistence(tmp_path) -> None:
    engine, test_session_maker = _test_session_maker(tmp_path, "chat.db")
    _seed_profile(test_session_maker)
    client = _build_client(test_session_maker, _fake_registry())

    create_response = client.post(
        "/api/v1/chat/conversations",
        json={
            "title": "First chat",
            "provider": "fake-local",
            "model": "tiny:latest",
            "profile_id": 1,
        },
    )
    assert create_response.status_code == 201
    conversation_id = create_response.json()["id"]

    with client.stream(
        "POST",
        f"/api/v1/chat/conversations/{conversation_id}/stream",
        json={
            "provider": "fake-local",
            "model": "tiny:latest",
            "prompt": "Hello",
            "profile_id": 1,
        },
    ) as response:
        assert response.status_code == 200
        body = "".join(response.iter_text())

    assert '"type":"token","content":"Hello "' in body
    assert '"type":"token","content":"back"' in body
    assert '"type":"done"' in body

    messages_response = client.get(f"/api/v1/chat/conversations/{conversation_id}/messages")
    messages = messages_response.json()
    assert [item["role"] for item in messages] == ["user", "assistant"]
    assert messages[1]["content"] == "Hello back"
    assert messages[1]["status"] == "complete"

    with Session(engine) as session:
        persisted = session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id.asc())
        ).all()
        assert [item.content for item in persisted] == ["Hello", "Hello back"]
        assert persisted[1].provider == "fake-local"


def test_generation_retries_once_before_any_tokens(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "retry.db")
    provider = FlakyProvider()
    _seed_profile(test_session_maker)
    client = _build_client(test_session_maker, _fake_registry(provider, attempts=2))

    conversation_id = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Retry", "provider": "fake-local", "profile_id": 1},
    ).json()["id"]

    with client.stream(
        "POST",
        f"/api/v1/chat/conversations/{conversation_id}/stream",
        json={
            "provider": "fake-local",
            "model": "tiny:latest",
            "prompt": "Hello",
            "profile_id": 1,
        },
    ) as response:
        body = "".join(response.iter_text())

    assert provider.calls == 2
    assert '"type":"retrying"' in body
    assert '"content":"Recovered"' in body
    assert '"type":"done"' in body


def test_offline_failure_is_persisted_and_provider_enters_cooldown(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "offline.db")
    registry = _fake_registry(OfflineProvider(), attempts=2)
    _seed_profile(test_session_maker)
    client = _build_client(test_session_maker, registry)

    conversation_id = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Offline", "provider": "fake-local", "profile_id": 1},
    ).json()["id"]

    with client.stream(
        "POST",
        f"/api/v1/chat/conversations/{conversation_id}/stream",
        json={
            "provider": "fake-local",
            "model": "tiny:latest",
            "prompt": "Hello",
            "profile_id": 1,
        },
    ) as response:
        body = "".join(response.iter_text())

    assert '"type":"retrying"' in body
    assert '"type":"error"' in body
    assert registry.runtime_state("fake-local").temporarily_offline is True

    messages = client.get(f"/api/v1/chat/conversations/{conversation_id}/messages").json()
    assert messages[-1]["role"] == "assistant"
    assert messages[-1]["status"] == "error"


def test_abandoned_pending_message_recovers_as_interrupted(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "recover.db")
    client = _build_client(test_session_maker, _fake_registry())

    conversation_id = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Recover", "provider": "fake-local"},
    ).json()["id"]

    with test_session_maker() as session:
        session.add(
            ChatMessage(
                conversation_id=conversation_id,
                role="assistant",
                content="partial",
                provider="fake-local",
                model="tiny:latest",
                status="pending",
            )
        )
        session.commit()

    messages = client.get(f"/api/v1/chat/conversations/{conversation_id}/messages").json()
    assert messages[-1]["content"] == "partial"
    assert messages[-1]["status"] == "interrupted"


def test_unknown_conversation_returns_404(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "chat-404.db")
    client = _build_client(test_session_maker, _fake_registry())

    response = client.get("/api/v1/chat/conversations/999/messages")
    assert response.status_code == 404


def test_unknown_profile_is_rejected(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "profile-404.db")
    client = _build_client(test_session_maker, _fake_registry())

    response = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Bad profile", "provider": "fake-local", "profile_id": 999},
    )
    assert response.status_code == 404


def test_unknown_provider_is_rejected(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "provider-404.db")
    client = _build_client(test_session_maker, _fake_registry())

    response = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Bad provider", "provider": "not-real"},
    )
    assert response.status_code == 404
