"""Chat persistence helpers and in-process generation cancellation."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import ChatMessage, Conversation, User

LOCAL_PRE_AUTH_USERNAME = "__local_pre_auth__"


def get_or_create_local_user(session: Session) -> User:
    """Return the temporary single local user used before Build 016 authentication."""

    user = session.scalar(select(User).where(User.username == LOCAL_PRE_AUTH_USERNAME))
    if user is not None:
        return user

    user = User(
        username=LOCAL_PRE_AUTH_USERNAME,
        password_hash="AUTH_NOT_CONFIGURED",
        role="owner",
        enabled=True,
    )
    session.add(user)
    session.flush()
    return user


def get_local_conversation(session: Session, conversation_id: int) -> Conversation | None:
    """Resolve a conversation owned by the pre-auth local user."""

    user = get_or_create_local_user(session)
    return session.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user.id,
        )
    )


def recover_incomplete_messages(session: Session, conversation_id: int) -> int:
    """Mark abandoned assistant generations as interrupted.

    An in-flight generation owned by this process is never recovered here.
    """

    if generation_registry.has_active_conversation(conversation_id):
        return 0

    result = session.execute(
        update(ChatMessage)
        .where(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.role == "assistant",
            ChatMessage.status.in_(("pending", "streaming")),
        )
        .values(status="interrupted")
    )
    return int(result.rowcount or 0)


@dataclass
class GenerationState:
    cancelled: bool
    conversation_id: int
    assistant_message_id: int


class GenerationRegistry:
    """Track cancellable in-flight generations in this backend process."""

    def __init__(self) -> None:
        self._states: dict[str, GenerationState] = {}

    def start(self, conversation_id: int, assistant_message_id: int) -> str:
        generation_id = str(uuid4())
        self._states[generation_id] = GenerationState(
            cancelled=False,
            conversation_id=conversation_id,
            assistant_message_id=assistant_message_id,
        )
        return generation_id

    def cancel(self, generation_id: str) -> bool:
        state = self._states.get(generation_id)
        if state is None:
            return False
        state.cancelled = True
        return True

    def is_cancelled(self, generation_id: str) -> bool:
        state = self._states.get(generation_id)
        return state.cancelled if state is not None else False

    def has_active_conversation(self, conversation_id: int) -> bool:
        return any(state.conversation_id == conversation_id for state in self._states.values())

    def finish(self, generation_id: str) -> None:
        self._states.pop(generation_id, None)


generation_registry = GenerationRegistry()
