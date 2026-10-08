"""Reliable provider-neutral streaming chat API."""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime, get_home_assistant_runtime
from rosevear_ai_hub.api.home_assistant_controls import (
    HomeAssistantControlRequest,
    control_entity,
)
from rosevear_ai_hub.chat import (
    generation_registry,
    get_or_create_local_user,
    get_user_conversation,
    recover_incomplete_messages,
)
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.home_language import (
    load_safe_control_allowlist,
    parse_home_command,
    resolve_home_command,
)
from rosevear_ai_hub.integrations.home_assistant import HomeAssistantError
from rosevear_ai_hub.models import ChatMessage, Conversation, ModelProfile, User
from rosevear_ai_hub.providers.base import ProviderRequestError, ProviderUnavailableError
from rosevear_ai_hub.providers.registry import ProviderRegistry, get_provider_registry
from rosevear_ai_hub.schemas import (
    CancelGenerationResponse,
    ChatMessageResponse,
    ChatStreamRequest,
    ConversationCreateRequest,
    ConversationResponse,
)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

SessionDependency = Annotated[Session, Depends(get_session)]
ProviderRegistryDependency = Annotated[ProviderRegistry, Depends(get_provider_registry)]


def _effective_user(request: Request, session: Session) -> User:
    authenticated = getattr(request.state, "user", None)
    return authenticated if isinstance(authenticated, User) else get_or_create_local_user(session)


def _conversation_response(conversation: Conversation) -> ConversationResponse:
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        provider=conversation.provider,
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
        provider=message.provider,
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


def _require_provider(registry: ProviderRegistry, key: str):
    try:
        return registry.get(key)
    except ProviderRequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


def _persist_assistant_state(
    bind: Engine,
    message_id: int,
    *,
    content: str,
    message_status: str,
) -> None:
    with Session(bind=bind, expire_on_commit=False) as stream_session:
        assistant_message = stream_session.get(ChatMessage, message_id)
        if assistant_message is None:
            return
        assistant_message.content = content
        assistant_message.status = message_status
        stream_session.commit()


async def _try_natural_language_home_command(
    *,
    profile: ModelProfile | None,
    prompt: str,
    user: User,
    runtime: HomeAssistantRuntime,
    session: Session,
) -> str | None:
    if profile is None or profile.slug != "home":
        return None

    parsed = parse_home_command(prompt)
    if parsed is None:
        preflight = resolve_home_command(prompt, [], set())
        if preflight.status == "not_home_command":
            return None
        return preflight.message

    if user.role == "read_only":
        return "This account is read-only and cannot execute Home Assistant actions."

    if runtime.client is None:
        return (
            "Home Assistant is not configured or its credential is unavailable, "
            "so the command was not executed."
        )

    try:
        states = await runtime.client.states()
    except HomeAssistantError as exc:
        return f"Home Assistant is unavailable, so the command was not executed: {exc}"

    resolution = resolve_home_command(
        prompt,
        states,
        load_safe_control_allowlist(session),
    )
    if resolution.status != "resolved":
        return resolution.message

    if resolution.entity_id is None or resolution.action is None:
        return "The home command could not be validated, so nothing was executed."

    try:
        result = await control_entity(
            HomeAssistantControlRequest(
                entity_id=resolution.entity_id,
                action=resolution.action,
            ),
            actor=user,
            runtime=runtime,
            db=session,
        )
    except HTTPException as exc:
        return f"The home command was not executed: {exc.detail}"

    friendly_name = resolution.friendly_name or result.entity_id
    if result.action == "on":
        summary = f"Turned on {friendly_name}."
    elif result.action == "off":
        summary = f"Turned off {friendly_name}."
    else:
        summary = f"Activated {friendly_name}."

    return (
        summary
        + " The exact allow-listed Level-1 action was validated and recorded in Audit."
    )


def _completed_chat_stream(
    *,
    conversation_id: int,
    assistant_message_id: int,
    provider_key: str,
    content: str,
) -> StreamingResponse:
    generation_id = generation_registry.start(conversation_id, assistant_message_id)

    async def generate() -> AsyncIterator[str]:
        try:
            yield (
                json.dumps(
                    {
                        "type": "generation",
                        "generation_id": generation_id,
                        "provider": provider_key,
                        "assistant_message_id": assistant_message_id,
                    },
                    separators=(",", ":"),
                )
                + "\n"
            )
            yield (
                json.dumps(
                    {"type": "token", "content": content},
                    separators=(",", ":"),
                )
                + "\n"
            )
            yield (
                json.dumps(
                    {"type": "done", "message_id": assistant_message_id},
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
            "X-Execution-Path": "deterministic-home-tool",
        },
    )


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(request: Request, session: SessionDependency) -> list[ConversationResponse]:
    user = _effective_user(request, session)
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
    payload: ConversationCreateRequest,
    request: Request,
    session: SessionDependency,
    registry: ProviderRegistryDependency,
) -> ConversationResponse:
    profile = _get_enabled_profile(session, payload.profile_id)
    if payload.profile_id is not None and profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model profile not found.",
        )

    provider_key = payload.provider or (profile.preferred_provider if profile else None) or "ollama"
    _require_provider(registry, provider_key)

    user = _effective_user(request, session)
    conversation = Conversation(
        user_id=user.id,
        title=payload.title.strip(),
        provider=provider_key,
        model=payload.model,
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
    request: Request,
    session: SessionDependency,
) -> list[ChatMessageResponse]:
    user = _effective_user(request, session)
    conversation = get_user_conversation(session, conversation_id, user)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    recovered = recover_incomplete_messages(session, conversation.id)
    if recovered:
        session.commit()
    else:
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
    payload: ChatStreamRequest,
    request: Request,
    session: SessionDependency,
    registry: ProviderRegistryDependency,
    home_runtime: Annotated[HomeAssistantRuntime, Depends(get_home_assistant_runtime)],
) -> StreamingResponse:
    user = _effective_user(request, session)
    conversation = get_user_conversation(session, conversation_id, user)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    selected_profile_id = (
        payload.profile_id if payload.profile_id is not None else conversation.profile_id
    )
    profile = _get_enabled_profile(session, selected_profile_id)
    if selected_profile_id is not None and profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model profile not found.",
        )

    provider_key = (
        payload.provider
        or (profile.preferred_provider if profile is not None else None)
        or conversation.provider
        or "ollama"
    )
    provider = _require_provider(registry, provider_key)

    bind = session.get_bind()
    if not isinstance(bind, Engine):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database engine unavailable.",
        )

    recover_incomplete_messages(session, conversation.id)

    conversation.provider = provider_key
    conversation.model = payload.model
    conversation.profile_id = profile.id if profile is not None else None
    conversation.updated_at = datetime.now(UTC)

    user_message = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=payload.prompt.strip(),
        provider=None,
        model=None,
        status="complete",
    )
    assistant_message = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content="",
        provider=provider_key,
        model=payload.model,
        status="pending",
    )
    session.add_all([user_message, assistant_message])
    session.commit()
    session.refresh(assistant_message)

    home_reply = await _try_natural_language_home_command(
        profile=profile,
        prompt=payload.prompt,
        user=user,
        runtime=home_runtime,
        session=session,
    )
    if home_reply is not None:
        assistant_message.content = home_reply
        assistant_message.status = "complete"
        session.commit()
        return _completed_chat_stream(
            conversation_id=conversation.id,
            assistant_message_id=assistant_message.id,
            provider_key="home-assistant",
            content=home_reply,
        )

    history = session.scalars(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.id.asc())
    ).all()

    provider_messages: list[dict[str, str]] = []
    if profile is not None:
        provider_messages.append({"role": "system", "content": profile.system_prompt})

    provider_messages.extend(
        {"role": item.role, "content": item.content}
        for item in history
        if item.role in {"user", "assistant", "system"} and item.status == "complete"
    )

    generation_id = generation_registry.start(conversation.id, assistant_message.id)

    async def generate() -> AsyncIterator[str]:
        chunks: list[str] = []
        finalized = False

        try:
            yield (
                json.dumps(
                    {
                        "type": "generation",
                        "generation_id": generation_id,
                        "provider": provider_key,
                        "assistant_message_id": assistant_message.id,
                    },
                    separators=(",", ":"),
                )
                + "\n"
            )

            runtime = registry.runtime_state(provider_key)
            if runtime.temporarily_offline:
                message = runtime.last_error or f"{provider_key} is temporarily offline."
                _persist_assistant_state(
                    bind,
                    assistant_message.id,
                    content="",
                    message_status="error",
                )
                finalized = True
                yield (
                    json.dumps(
                        {
                            "type": "error",
                            "message": message,
                            "provider": provider_key,
                            "retryable": True,
                            "retry_after_seconds": runtime.retry_after_seconds,
                        },
                        separators=(",", ":"),
                    )
                    + "\n"
                )
                return

            max_attempts = registry.generation_attempts

            for attempt in range(1, max_attempts + 1):
                produced_token = False
                try:
                    if generation_registry.is_cancelled(generation_id):
                        _persist_assistant_state(
                            bind,
                            assistant_message.id,
                            content="".join(chunks),
                            message_status="cancelled",
                        )
                        finalized = True
                        yield (
                            json.dumps(
                                {"type": "cancelled"},
                                separators=(",", ":"),
                            )
                            + "\n"
                        )
                        return

                    async for token in provider.stream_chat(payload.model, provider_messages):
                        produced_token = True

                        if generation_registry.is_cancelled(generation_id):
                            _persist_assistant_state(
                                bind,
                                assistant_message.id,
                                content="".join(chunks),
                                message_status="cancelled",
                            )
                            finalized = True
                            yield (
                                json.dumps(
                                    {"type": "cancelled"},
                                    separators=(",", ":"),
                                )
                                + "\n"
                            )
                            return

                        chunks.append(token)
                        yield (
                            json.dumps(
                                {"type": "token", "content": token},
                                separators=(",", ":"),
                            )
                            + "\n"
                        )

                    registry.mark_success(provider_key)
                    _persist_assistant_state(
                        bind,
                        assistant_message.id,
                        content="".join(chunks),
                        message_status="complete",
                    )
                    finalized = True
                    yield (
                        json.dumps(
                            {"type": "done", "message_id": assistant_message.id},
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                    return
                except ProviderUnavailableError as exc:
                    can_retry = not produced_token and attempt < max_attempts
                    if can_retry:
                        yield (
                            json.dumps(
                                {
                                    "type": "retrying",
                                    "provider": provider_key,
                                    "attempt": attempt + 1,
                                    "max_attempts": max_attempts,
                                    "message": str(exc),
                                },
                                separators=(",", ":"),
                            )
                            + "\n"
                        )
                        if registry.retry_delay_seconds:
                            await asyncio.sleep(registry.retry_delay_seconds * attempt)
                        continue

                    registry.mark_unavailable(provider_key, str(exc))
                    _persist_assistant_state(
                        bind,
                        assistant_message.id,
                        content="".join(chunks),
                        message_status="error",
                    )
                    finalized = True
                    runtime = registry.runtime_state(provider_key)
                    yield (
                        json.dumps(
                            {
                                "type": "error",
                                "message": str(exc),
                                "provider": provider_key,
                                "retryable": not produced_token,
                                "retry_after_seconds": runtime.retry_after_seconds,
                            },
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                    return
                except ProviderRequestError as exc:
                    _persist_assistant_state(
                        bind,
                        assistant_message.id,
                        content="".join(chunks),
                        message_status="error",
                    )
                    finalized = True
                    yield (
                        json.dumps(
                            {
                                "type": "error",
                                "message": str(exc),
                                "provider": provider_key,
                                "retryable": False,
                                "retry_after_seconds": 0,
                            },
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
                    return
        finally:
            if not finalized:
                _persist_assistant_state(
                    bind,
                    assistant_message.id,
                    content="".join(chunks),
                    message_status=(
                        "cancelled"
                        if generation_registry.is_cancelled(generation_id)
                        else "interrupted"
                    ),
                )
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
