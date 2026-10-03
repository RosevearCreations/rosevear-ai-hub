from collections.abc import AsyncIterator

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from rosevear_ai_hub.api.ollama import get_ollama_client
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, ChatMessage


class FakeStreamingOllamaClient:
    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, str]],
    ) -> AsyncIterator[str]:
        assert model == "tiny:latest"
        assert messages[-1] == {"role": "user", "content": "Hello"}
        yield "Hello "
        yield "back"


def test_conversation_stream_and_message_persistence(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'chat.db'}")
    Base.metadata.create_all(engine)
    test_session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_ollama_client] = FakeStreamingOllamaClient
    client = TestClient(application)

    create_response = client.post(
        "/api/v1/chat/conversations",
        json={"title": "First chat", "model": "tiny:latest"},
    )
    assert create_response.status_code == 201
    conversation_id = create_response.json()["id"]

    with client.stream(
        "POST",
        f"/api/v1/chat/conversations/{conversation_id}/stream",
        json={"model": "tiny:latest", "prompt": "Hello"},
    ) as response:
        assert response.status_code == 200
        assert response.headers["x-generation-id"]
        body = "".join(response.iter_text())

    assert '"type":"token","content":"Hello "' in body
    assert '"type":"token","content":"back"' in body
    assert '"type":"done"' in body

    messages_response = client.get(f"/api/v1/chat/conversations/{conversation_id}/messages")
    assert messages_response.status_code == 200
    messages = messages_response.json()
    assert [item["role"] for item in messages] == ["user", "assistant"]
    assert messages[1]["content"] == "Hello back"
    assert messages[1]["model"] == "tiny:latest"

    with Session(engine) as session:
        persisted = session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.id.asc())
        ).all()
        assert [item.content for item in persisted] == ["Hello", "Hello back"]


def test_unknown_conversation_returns_404(tmp_path) -> None:
    engine = build_engine(f"sqlite:///{tmp_path / 'chat-404.db'}")
    Base.metadata.create_all(engine)
    test_session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with test_session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_ollama_client] = FakeStreamingOllamaClient
    client = TestClient(application)

    response = client.get("/api/v1/chat/conversations/999/messages")
    assert response.status_code == 404
