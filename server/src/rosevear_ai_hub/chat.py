"""Chat persistence helpers and in-process generation cancellation."""

from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.models import Conversation, User

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


class GenerationRegistry:
    """Track cancellable in-flight generations in this backend process."""

    def __init__(self) -> None:
        self._cancelled: dict[str, bool] = {}

    def start(self) -> str:
        generation_id = str(uuid4())
        self._cancelled[generation_id] = False
        return generation_id

    def cancel(self, generation_id: str) -> bool:
        if generation_id not in self._cancelled:
            return False
        self._cancelled[generation_id] = True
        return True

    def is_cancelled(self, generation_id: str) -> bool:
        return self._cancelled.get(generation_id, False)

    def finish(self, generation_id: str) -> None:
        self._cancelled.pop(generation_id, None)


generation_registry = GenerationRegistry()
