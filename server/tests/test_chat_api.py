from collections.abc import AsyncIterator
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, ChatMessage, ModelProfile
from rosevear_ai_hub.providers.base import AIProvider, ProviderDescriptor, ProviderHealth
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


def _test_session_maker(tmp_path, filename: str):
    engine = build_engine(f"sqlite:///{tmp_path / filename}")
    Base.metadata.create_all(engine)
    return engine, sessionmaker(bind=engine, expire_on_commit=False)


def _fake_registry() -> ProviderRegistry:
    return ProviderRegistry([FakeStreamingProvider()])


def test_conversation_stream_profile_provider_and_message_persistence(tmp_path) -> None:
    engine, test_session_maker = _test_session_maker(tmp_path, "chat.db")

    with test_session_maker() as session:
        session.add(
            ModelProfile(
                id=1,
                slug="general",
                name="General",
                system_prompt="Keep answers practical and local.",
                preferred_provider="fake-local",
                preferred_model=None,
                privacy_policy="local_only",
                enabled=True,
                built_in=True,
            )
        )
        session.commit()

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = _fake_registry
    client = TestClient(application)

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
    assert create_response.json()["profile_id"] == 1
    assert create_response.json()["provider"] == "fake-local"
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
        assert response.headers["x-generation-id"]
        body = "".join(response.iter_text())

    assert '"type":"generation"' in body
    assert '"provider":"fake-local"' in body
    assert '"type":"token","content":"Hello "' in body
    assert '"type":"token","content":"back"' in body
    assert '"type":"done"' in body

    messages_response = client.get(f"/api/v1/chat/conversations/{conversation_id}/messages")
    assert messages_response.status_code == 200
    messages = messages_response.json()
    assert [item["role"] for item in messages] == ["user", "assistant"]
    assert messages[0]["provider"] is None
    assert messages[1]["provider"] == "fake-local"
    assert messages[1]["content"] == "Hello back"
    assert messages[1]["model"] == "tiny:latest"

    with Session(engine) as session:
        persisted = session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id.asc())
        ).all()
        assert [item.content for item in persisted] == ["Hello", "Hello back"]
        assert persisted[1].provider == "fake-local"


def test_unknown_conversation_returns_404(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "chat-404.db")

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = _fake_registry
    client = TestClient(application)

    response = client.get("/api/v1/chat/conversations/999/messages")
    assert response.status_code == 404


def test_unknown_profile_is_rejected(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "profile-404.db")

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = _fake_registry
    client = TestClient(application)

    response = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Bad profile", "provider": "fake-local", "profile_id": 999},
    )
    assert response.status_code == 404


def test_unknown_provider_is_rejected(tmp_path) -> None:
    _, test_session_maker = _test_session_maker(tmp_path, "provider-404.db")

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_provider_registry] = _fake_registry
    client = TestClient(application)

    response = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Bad provider", "provider": "not-real"},
    )
    assert response.status_code == 404
