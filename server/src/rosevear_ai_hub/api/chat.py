"""Conversation persistence and streaming local chat API."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.ollama import get_ollama_client
from rosevear_ai_hub.chat import (
    generation_registry,
    get_local_conversation,
    get_or_create_local_user,
)
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.ollama import (
    OllamaClient,
    OllamaRequestError,
    OllamaUnavailableError,
)
from rosevear_ai_hub.models import ChatMessage, Conversation, ModelProfile
from rosevear_ai_hub.schemas import (
    CancelGenerationResponse,
    ChatMessageResponse,
    ChatStreamRequest,
    ConversationCreateRequest,
    ConversationResponse,
)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

SessionDependency = Annotated[Session, Depends(get_session)]
OllamaClientDependency = Annotated[OllamaClient, Depends(get_ollama_client)]


def _conversation_response(conversation: Conversation) -> ConversationResponse:
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        model=conversation.model,
        profile_id=conversation.profile_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _message_response(message: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        role=cast("str", message.role),
        content=message.content,
        model=message.model,
        status=message.status,
        created_at=message.created_at,
    )


def _get_enabled_profile(session: Session, profile_id: int | None) -> ModelProfile | None:
    if profile_id is None:
        return None

    return session.scalar(
        select(ModelProfile).where(
            ModelProfile.id == profile_id,
            ModelProfile.enabled.is_(True),
        )
    )


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(session: SessionDependency) -> list[ConversationResponse]:
    user = get_or_create_local_user(session)
    session.commit()

    conversations = session.scalars(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .limit(100)
    ).all()
    return [_conversation_response(item) for item in conversations]


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    request: ConversationCreateRequest,
    session: SessionDependency,
) -> ConversationResponse:
    profile = _get_enabled_profile(session, request.profile_id)
    if request.profile_id is not None and profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model profile not found.",
        )

    user = get_or_create_local_user(session)
    conversation = Conversation(
        user_id=user.id,
        title=request.title.strip(),
        model=request.model,
        profile_id=profile.id if profile is not None else None,
    )
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return _conversation_response(conversation)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[ChatMessageResponse],
)
def list_messages(
    conversation_id: int,
    session: SessionDependency,
) -> list[ChatMessageResponse]:
    conversation = get_local_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    session.commit()
    messages = session.scalars(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.id.asc())
    ).all()
    return [_message_response(item) for item in messages]


@router.post("/conversations/{conversation_id}/stream")
async def stream_chat(
    conversation_id: int,
    request: ChatStreamRequest,
    session: SessionDependency,
    client: OllamaClientDependency,
) -> StreamingResponse:
    conversation = get_local_conversation(session, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    selected_profile_id = (
        request.profile_id if request.profile_id is not None else conversation.profile_id
    )
    profile = _get_enabled_profile(session, selected_profile_id)
    if selected_profile_id is not None and profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model profile not found.",
        )

    conversation.model = request.model
    conversation.profile_id = profile.id if profile is not None else None
    conversation.updated_at = datetime.now(UTC)

    user_message = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=request.prompt.strip(),
        model=None,
        status="complete",
    )
    session.add(user_message)
    session.commit()

    history = session.scalars(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.id.asc())
    ).all()

    ollama_messages: list[dict[str, str]] = []
    if profile is not None:
        ollama_messages.append({"role": "system", "content": profile.system_prompt})

    ollama_messages.extend(
        {"role": item.role, "content": item.content}
        for item in history
        if item.role in {"user", "assistant", "system"} and item.status == "complete"
    )

    generation_id = generation_registry.start()
    bind = session.get_bind()
    if not isinstance(bind, Engine):
        generation_registry.finish(generation_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database engine unavailable.",
        )

    async def generate() -> AsyncIterator[str]:
        chunks: list[str] = []
        try:
            yield (
                json.dumps(
                    {"type": "generation", "generation_id": generation_id},
                    separators=(",", ":"),
                )
                + "\n"
            )

            async for token in client.stream_chat(request.model, ollama_messages):
                if generation_registry.is_cancelled(generation_id):
                    yield json.dumps({"type": "cancelled"}, separators=(",", ":")) + "\n"
                    return

                chunks.append(token)
                yield (
                    json.dumps(
                        {"type": "token", "content": token},
                        separators=(",", ":"),
                    )
                    + "\n"
                )

            if generation_registry.is_cancelled(generation_id):
                yield json.dumps({"type": "cancelled"}, separators=(",", ":")) + "\n"
                return

            assistant_text = "".join(chunks)
            with Session(bind=bind, expire_on_commit=False) as stream_session:
                assistant_message = ChatMessage(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=assistant_text,
                    model=request.model,
                    status="complete",
                )
                stream_session.add(assistant_message)
                stream_session.commit()
                stream_session.refresh(assistant_message)
                message_id = assistant_message.id

            yield (
                json.dumps(
                    {"type": "done", "message_id": message_id},
                    separators=(",", ":"),
                )
                + "\n"
            )
        except (OllamaUnavailableError, OllamaRequestError) as exc:
            yield (
                json.dumps(
                    {"type": "error", "message": str(exc)},
                    separators=(",", ":"),
                )
                + "\n"
            )
        finally:
            generation_registry.finish(generation_id)

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-store",
            "X-Generation-ID": generation_id,
        },
    )


@router.post(
    "/generations/{generation_id}/cancel",
    response_model=CancelGenerationResponse,
)
def cancel_generation(generation_id: str) -> CancelGenerationResponse:
    return CancelGenerationResponse(
        generation_id=generation_id,
        cancelled=generation_registry.cancel(generation_id),
    )
