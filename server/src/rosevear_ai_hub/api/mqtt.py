"""Authenticated MQTT API for Build 025."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from threading import Lock
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.auth import require_authenticated
from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import get_session
from rosevear_ai_hub.integrations.mqtt import (
    MQTTClient,
    MQTTConfigurationError,
    MQTTError,
    MQTTTopicDeniedError,
    MQTTUnavailableError,
    validate_topic_filter,
)
from rosevear_ai_hub.models import User
from rosevear_ai_hub.secrets import resolve_secret

router = APIRouter(prefix="/api/v1/mqtt", tags=["mqtt"])


class MQTTStatusResponse(BaseModel):
    configured: bool
    available: bool
    host: str | None
    port: int
    tls: bool
    username_configured: bool
    password_configured: bool
    allowed_topics: list[str]
    subscriptions: list[str] = Field(default_factory=list)
    reconnect_min_seconds: int
    reconnect_max_seconds: int
    message_count: int = 0
    last_error: str | None = None
    message: str


class MQTTSubscribeRequest(BaseModel):
    topic_filter: str = Field(min_length=1, max_length=512)
    qos: Literal[0, 1] = 0


class MQTTSubscriptionResponse(BaseModel):
    subscribed: bool
    topic_filter: str
    qos: int


class MQTTPublishRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=512)
    payload: str = Field(max_length=65536)
    qos: Literal[0, 1] = 0
    retain: Literal[False] = False


class MQTTPublishResponse(BaseModel):
    accepted: bool
    topic: str
    qos: int
    retain: bool
    message_id: int


class MQTTMessageResponse(BaseModel):
    topic: str
    payload: str
    qos: int
    retain: bool
    received_at: str


@dataclass(frozen=True)
class MQTTRuntime:
    client: MQTTClient | None
    host: str | None
    port: int
    tls: bool
    username_configured: bool
    password_configured: bool
    allowed_topics: tuple[str, ...]
    reconnect_min_seconds: int
    reconnect_max_seconds: int
    configuration_error: str | None = None


_runtime_lock = Lock()
_runtime_signature: tuple[object, ...] | None = None
_runtime_client: MQTTClient | None = None


def _parse_allowed_topics(raw: str) -> tuple[str, ...]:
    values = tuple(dict.fromkeys(item.strip() for item in raw.split(",") if item.strip()))
    if len(values) > 100:
        raise MQTTConfigurationError("MQTT_ALLOWED_TOPICS supports at most 100 filters.")
    return tuple(validate_topic_filter(item) for item in values)


def _password_fingerprint(password: str | None) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest() if password else ""


def get_mqtt_runtime(db: Annotated[Session, Depends(get_session)]) -> MQTTRuntime:
    settings = get_settings()
    host = settings.mqtt_host.strip()
    username = settings.mqtt_username.strip()
    try:
        allowed_topics = _parse_allowed_topics(settings.mqtt_allowed_topics)
    except MQTTConfigurationError as exc:
        return MQTTRuntime(
            None,
            host or None,
            settings.mqtt_port,
            settings.mqtt_tls,
            bool(username),
            False,
            (),
            settings.mqtt_reconnect_min_seconds,
            settings.mqtt_reconnect_max_seconds,
            str(exc),
        )
    try:
        password = resolve_secret(db, "mqtt.password", settings)
        secret_error = None
    except RuntimeError:
        password = None
        secret_error = "MQTT password could not be resolved from encrypted secret storage."

    missing = []
    if not host:
        missing.append("MQTT_HOST")
    if not username:
        missing.append("MQTT_USERNAME")
    if not password:
        missing.append("MQTT password")
    if not allowed_topics:
        missing.append("MQTT_ALLOWED_TOPICS")
    if missing or secret_error:
        detail = secret_error or "Configure " + ", ".join(missing) + " to enable MQTT."
        return MQTTRuntime(
            None,
            host or None,
            settings.mqtt_port,
            settings.mqtt_tls,
            bool(username),
            bool(password),
            allowed_topics,
            settings.mqtt_reconnect_min_seconds,
            settings.mqtt_reconnect_max_seconds,
            detail,
        )

    signature = (
        host,
        settings.mqtt_port,
        username,
        _password_fingerprint(password),
        settings.mqtt_tls,
        settings.mqtt_client_id,
        settings.mqtt_keepalive_seconds,
        settings.mqtt_reconnect_min_seconds,
        settings.mqtt_reconnect_max_seconds,
        allowed_topics,
    )
    global _runtime_client, _runtime_signature
    with _runtime_lock:
        if _runtime_signature != signature or _runtime_client is None:
            if _runtime_client is not None:
                _runtime_client.close()
            try:
                client = MQTTClient(
                    host,
                    settings.mqtt_port,
                    username=username,
                    password=password or "",
                    allowed_topics=allowed_topics,
                    tls=settings.mqtt_tls,
                    client_id=settings.mqtt_client_id,
                    keepalive_seconds=settings.mqtt_keepalive_seconds,
                    reconnect_min_seconds=settings.mqtt_reconnect_min_seconds,
                    reconnect_max_seconds=settings.mqtt_reconnect_max_seconds,
                )
                client.start()
            except MQTTError as exc:
                return MQTTRuntime(
                    None,
                    host,
                    settings.mqtt_port,
                    settings.mqtt_tls,
                    True,
                    True,
                    allowed_topics,
                    settings.mqtt_reconnect_min_seconds,
                    settings.mqtt_reconnect_max_seconds,
                    str(exc),
                )
            _runtime_client = client
            _runtime_signature = signature
        runtime_client = _runtime_client

    return MQTTRuntime(
        runtime_client,
        host,
        settings.mqtt_port,
        settings.mqtt_tls,
        True,
        True,
        allowed_topics,
        settings.mqtt_reconnect_min_seconds,
        settings.mqtt_reconnect_max_seconds,
    )


MQTTRuntimeDependency = Annotated[MQTTRuntime, Depends(get_mqtt_runtime)]


def _require_client(runtime: MQTTRuntime) -> MQTTClient:
    if runtime.client is None:
        raise HTTPException(
            status_code=503,
            detail=runtime.configuration_error or "MQTT is not configured.",
        )
    return runtime.client


def _http_error(exc: MQTTError) -> HTTPException:
    if isinstance(exc, MQTTTopicDeniedError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, MQTTUnavailableError):
        return HTTPException(status_code=503, detail=str(exc))
    return HTTPException(status_code=422, detail=str(exc))


@router.get("/status", response_model=MQTTStatusResponse)
def mqtt_status(runtime: MQTTRuntimeDependency) -> MQTTStatusResponse:
    snapshot = runtime.client.snapshot() if runtime.client is not None else {}
    available = bool(snapshot.get("connected"))
    configured = runtime.client is not None
    if available:
        message = "MQTT broker connected."
    elif configured:
        message = snapshot.get("last_error") or "MQTT connection is starting or reconnecting."
    else:
        message = runtime.configuration_error or "MQTT is not configured."
    return MQTTStatusResponse(
        configured=configured,
        available=available,
        host=runtime.host,
        port=runtime.port,
        tls=runtime.tls,
        username_configured=runtime.username_configured,
        password_configured=runtime.password_configured,
        allowed_topics=list(runtime.allowed_topics),
        subscriptions=list(snapshot.get("subscriptions", [])),
        reconnect_min_seconds=runtime.reconnect_min_seconds,
        reconnect_max_seconds=runtime.reconnect_max_seconds,
        message_count=int(snapshot.get("message_count", 0)),
        last_error=snapshot.get("last_error"),
        message=str(message),
    )


@router.get("/messages", response_model=list[MQTTMessageResponse])
def mqtt_messages(
    runtime: MQTTRuntimeDependency,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[MQTTMessageResponse]:
    return [
        MQTTMessageResponse(**item.__dict__) for item in _require_client(runtime).messages(limit)
    ]


@router.post("/subscriptions", response_model=MQTTSubscriptionResponse)
def mqtt_subscribe(
    payload: MQTTSubscribeRequest,
    actor: Annotated[User | None, Depends(require_authenticated)],
    runtime: MQTTRuntimeDependency,
) -> MQTTSubscriptionResponse:
    if actor is None:
        raise HTTPException(status_code=403, detail="Complete owner bootstrap before MQTT writes.")
    try:
        topic_filter, qos = _require_client(runtime).subscribe(payload.topic_filter, payload.qos)
    except MQTTError as exc:
        raise _http_error(exc) from exc
    return MQTTSubscriptionResponse(subscribed=True, topic_filter=topic_filter, qos=qos)


@router.post("/publish", response_model=MQTTPublishResponse)
def mqtt_publish(
    payload: MQTTPublishRequest,
    actor: Annotated[User | None, Depends(require_authenticated)],
    runtime: MQTTRuntimeDependency,
    db: Annotated[Session, Depends(get_session)],
) -> MQTTPublishResponse:
    if actor is None:
        raise HTTPException(status_code=403, detail="Complete owner bootstrap before MQTT writes.")
    encoded = payload.payload.encode("utf-8")
    arguments = {
        "topic": payload.topic,
        "qos": payload.qos,
        "retain": False,
        "payload_bytes": len(encoded),
        "payload_sha256": hashlib.sha256(encoded).hexdigest(),
    }
    try:
        message_id = _require_client(runtime).publish(payload.topic, payload.payload, payload.qos)
    except MQTTError as exc:
        record_audit_event(
            db,
            actor_user_id=actor.id,
            event_type="mqtt.publish.failed",
            object_type="mqtt_topic",
            object_id=payload.topic,
            action="publish",
            arguments=arguments,
            result={"ok": False, "error": str(exc)},
        )
        db.commit()
        raise _http_error(exc) from exc
    record_audit_event(
        db,
        actor_user_id=actor.id,
        event_type="mqtt.publish.completed",
        object_type="mqtt_topic",
        object_id=payload.topic,
        action="publish",
        arguments=arguments,
        result={"ok": True, "message_id": message_id},
    )
    db.commit()
    return MQTTPublishResponse(
        accepted=True, topic=payload.topic, qos=payload.qos, retain=False, message_id=message_id
    )
