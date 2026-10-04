"""Local authentication, sessions, and role enforcement for Build 016."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Annotated, Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.models import AuditEvent, HubSession, User

SESSION_COOKIE_NAME = "rosevear_ai_hub_session"
ROLES = ("owner", "administrator", "household_user", "read_only")
PasswordRole = Literal["owner", "administrator", "household_user", "read_only"]
_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)


class UserResponse(BaseModel):
    id: int
    username: str
    role: PasswordRole
    enabled: bool
    created_at: datetime


class AuthStatusResponse(BaseModel):
    bootstrap_required: bool
    authenticated: bool
    user: UserResponse | None = None


class CredentialsRequest(BaseModel):
    username: str = Field(min_length=3, max_length=128, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=12, max_length=256)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class UserCreateRequest(CredentialsRequest):
    role: PasswordRole = "household_user"


class UserUpdateRequest(BaseModel):
    role: PasswordRole | None = None
    enabled: bool | None = None
    new_password: str | None = Field(default=None, min_length=12, max_length=256)


class MessageResponse(BaseModel):
    ok: bool
    message: str


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except VerificationError:
        return False


def _token_hash(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        enabled=user.enabled,
        created_at=user.created_at,
    )


def _record_auth_event(
    db: Session,
    *,
    actor_user_id: int | None,
    event_type: str,
    action: str,
    object_id: str | None,
    result: dict[str, object],
) -> None:
    db.add(
        AuditEvent(
            actor_user_id=actor_user_id,
            event_type=event_type,
            object_type="authentication",
            object_id=object_id,
            action=action,
            sanitized_arguments=None,
            result=result,
        )
    )


def _issue_session(db: Session, user: User) -> str:
    settings = get_settings()
    raw_token = token_urlsafe(48)
    now = datetime.now(UTC)
    db.add(
        HubSession(
            user_id=user.id,
            token_hash=_token_hash(raw_token),
            created_at=now,
            expires_at=now + timedelta(hours=settings.auth_session_hours),
        )
    )
    _record_auth_event(
        db,
        actor_user_id=user.id,
        event_type="auth.session.created",
        action="login",
        object_id=str(user.id),
        result={"ok": True},
    )
    db.commit()
    return raw_token


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.auth_session_hours * 3600,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite="strict",
        path="/",
    )


def _resolve_user(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    session_record = db.scalar(
        select(HubSession).where(HubSession.token_hash == _token_hash(token))
    )
    if session_record is None or session_record.revoked_at is not None:
        return None
    if _utc(session_record.expires_at) <= datetime.now(UTC):
        return None
    user = db.get(User, session_record.user_id)
    if user is None or not user.enabled:
        return None
    return user


def _user_count(db: Session) -> int:
    return int(db.scalar(select(func.count(User.id))) or 0)


def require_authenticated(
    request: Request,
    db: Annotated[Session, Depends(get_session)],
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> User | None:
    """Protect application APIs after the one-time owner bootstrap is complete."""

    if _user_count(db) == 0:
        return None

    user = _resolve_user(db, session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    request.state.user = user
    return user


def require_roles(*roles: str):
    def dependency(
        request: Request,
        db: Annotated[Session, Depends(get_session)],
        session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
    ) -> User:
        user = _resolve_user(db, session_token)
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication required.")
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permission.")
        request.state.user = user
        return user

    return dependency


@router.get("/status", response_model=AuthStatusResponse)
def auth_status(
    db: Annotated[Session, Depends(get_session)],
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> AuthStatusResponse:
    bootstrap_required = _user_count(db) == 0
    user = _resolve_user(db, session_token)
    return AuthStatusResponse(
        bootstrap_required=bootstrap_required,
        authenticated=user is not None,
        user=_user_response(user) if user else None,
    )


@router.post("/bootstrap", response_model=UserResponse, status_code=201)
def bootstrap_owner(
    payload: CredentialsRequest,
    response: Response,
    db: Annotated[Session, Depends(get_session)],
) -> UserResponse:
    if _user_count(db) != 0:
        raise HTTPException(status_code=409, detail="Owner bootstrap has already been completed.")

    owner = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role="owner",
        enabled=True,
    )
    db.add(owner)
    db.flush()
    _record_auth_event(
        db,
        actor_user_id=owner.id,
        event_type="auth.bootstrap",
        action="create_owner",
        object_id=str(owner.id),
        result={"ok": True},
    )
    db.commit()
    db.refresh(owner)
    token = _issue_session(db, owner)
    _set_session_cookie(response, token)
    return _user_response(owner)


@router.post("/login", response_model=UserResponse)
def login(
    payload: CredentialsRequest,
    response: Response,
    db: Annotated[Session, Depends(get_session)],
) -> UserResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    if not user.enabled:
        raise HTTPException(status_code=403, detail="This account is disabled.")

    token = _issue_session(db, user)
    _set_session_cookie(response, token)
    return _user_response(user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    db: Annotated[Session, Depends(get_session)],
    session_token: Annotated[str | None, Cookie(alias=SESSION_COOKIE_NAME)] = None,
) -> MessageResponse:
    if session_token:
        record = db.scalar(
            select(HubSession).where(HubSession.token_hash == _token_hash(session_token))
        )
        if record is not None and record.revoked_at is None:
            record.revoked_at = datetime.now(UTC)
            _record_auth_event(
                db,
                actor_user_id=record.user_id,
                event_type="auth.session.revoked",
                action="logout",
                object_id=str(record.user_id),
                result={"ok": True},
            )
            db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return MessageResponse(ok=True, message="Signed out.")


@router.get("/me", response_model=UserResponse)
def me(
    user: Annotated[User, Depends(require_roles(*ROLES))],
) -> UserResponse:
    return _user_response(user)


@router.get("/users", response_model=list[UserResponse])
def list_users(
    _: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> list[UserResponse]:
    users = db.scalars(select(User).order_by(User.username.asc())).all()
    return [_user_response(user) for user in users]


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreateRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> UserResponse:
    if actor.role != "owner" and payload.role in {"owner", "administrator"}:
        raise HTTPException(status_code=403, detail="Only an owner can create privileged accounts.")
    if db.scalar(select(User).where(User.username == payload.username)) is not None:
        raise HTTPException(status_code=409, detail="Username already exists.")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
        enabled=True,
    )
    db.add(user)
    db.flush()
    _record_auth_event(
        db,
        actor_user_id=actor.id,
        event_type="auth.user.created",
        action="create_user",
        object_id=str(user.id),
        result={"ok": True, "role": user.role},
    )
    db.commit()
    db.refresh(user)
    return _user_response(user)


def _enabled_owner_count(db: Session) -> int:
    return int(
        db.scalar(
            select(func.count(User.id)).where(User.role == "owner", User.enabled.is_(True))
        )
        or 0
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    actor: Annotated[User, Depends(require_roles("owner", "administrator"))],
    db: Annotated[Session, Depends(get_session)],
) -> UserResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")

    desired_role = payload.role if payload.role is not None else user.role
    desired_enabled = payload.enabled if payload.enabled is not None else user.enabled

    if actor.role != "owner":
        if user.role in {"owner", "administrator"} or desired_role in {"owner", "administrator"}:
            raise HTTPException(status_code=403, detail="Only an owner can manage privileged accounts.")

    removing_last_owner = (
        user.role == "owner"
        and user.enabled
        and (desired_role != "owner" or not desired_enabled)
        and _enabled_owner_count(db) <= 1
    )
    if removing_last_owner:
        raise HTTPException(status_code=409, detail="At least one enabled owner is required.")

    user.role = desired_role
    user.enabled = desired_enabled
    if payload.new_password is not None:
        user.password_hash = hash_password(payload.new_password)

    _record_auth_event(
        db,
        actor_user_id=actor.id,
        event_type="auth.user.updated",
        action="update_user",
        object_id=str(user.id),
        result={"ok": True, "role": user.role, "enabled": user.enabled},
    )
    db.commit()
    db.refresh(user)
    return _user_response(user)
