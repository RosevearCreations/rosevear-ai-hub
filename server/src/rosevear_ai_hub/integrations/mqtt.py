"""Authenticated, allow-listed MQTT client for Build 025."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from typing import Any, Callable

from paho.mqtt import client as mqtt


class MQTTError(RuntimeError):
    """Base MQTT connector failure."""


class MQTTConfigurationError(MQTTError):
    """Unsafe or incomplete MQTT configuration."""


class MQTTUnavailableError(MQTTError):
    """Broker operation cannot proceed while unavailable."""


class MQTTTopicDeniedError(MQTTError):
    """Topic is outside the configured policy."""


@dataclass(frozen=True)
class MQTTMessageRecord:
    topic: str
    payload: str
    qos: int
    retain: bool
    received_at: str


def validate_topic_filter(topic_filter: str) -> str:
    value = topic_filter.strip()
    if not value or len(value) > 512 or "\x00" in value:
        raise MQTTConfigurationError("MQTT topic filters must be 1-512 characters.")
    levels = value.split("/")
    for index, level in enumerate(levels):
        if "#" in level and (level != "#" or index != len(levels) - 1):
            raise MQTTConfigurationError("MQTT # wildcard must occupy the final topic level.")
        if "+" in level and level != "+":
            raise MQTTConfigurationError("MQTT + wildcard must occupy a complete topic level.")
    return value


def validate_publish_topic(topic: str) -> str:
    value = topic.strip()
    if not value or len(value) > 512 or "\x00" in value:
        raise MQTTTopicDeniedError("MQTT publish topics must be 1-512 characters.")
    if "#" in value or "+" in value:
        raise MQTTTopicDeniedError("MQTT publish topics cannot contain wildcards.")
    return value


def validate_broker_host(host: str) -> str:
    value = host.strip()
    if (
        not value
        or len(value) > 255
        or "://" in value
        or "/" in value
        or "\\" in value
        or any(character.isspace() for character in value)
    ):
        raise MQTTConfigurationError("MQTT_HOST must be a hostname or IP address, not a URL.")
    return value


def _matches_allowed_filter(topic: str, filters: tuple[str, ...]) -> bool:
    return any(mqtt.topic_matches_sub(item, topic) for item in filters)


def _subscription_allowed(topic_filter: str, filters: tuple[str, ...]) -> bool:
    if "#" in topic_filter or "+" in topic_filter:
        return topic_filter in filters
    return _matches_allowed_filter(topic_filter, filters)


def _reason_value(reason_code: Any) -> int:
    raw = getattr(reason_code, "value", reason_code)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 1


class MQTTClient:
    """Threaded Paho client with fail-closed topic policy."""

    def __init__(
        self,
        host: str,
        port: int,
        *,
        username: str,
        password: str,
        allowed_topics: tuple[str, ...],
        tls: bool = False,
        client_id: str = "rosevear-ai-hub",
        keepalive_seconds: int = 60,
        reconnect_min_seconds: int = 1,
        reconnect_max_seconds: int = 30,
        message_buffer_size: int = 200,
        client_factory: Callable[..., Any] | None = None,
    ) -> None:
        self.host = validate_broker_host(host)
        if not username.strip() or not password:
            raise MQTTConfigurationError("MQTT username and password are required.")
        if not allowed_topics:
            raise MQTTConfigurationError("At least one MQTT allowed topic is required.")
        self.allowed_topics = tuple(validate_topic_filter(item) for item in allowed_topics)
        if reconnect_max_seconds < reconnect_min_seconds:
            raise MQTTConfigurationError(
                "MQTT_RECONNECT_MAX_SECONDS must be greater than or equal to the minimum."
            )
        self.port = port
        self.tls = tls
        self.keepalive_seconds = keepalive_seconds
        self.reconnect_min_seconds = reconnect_min_seconds
        self.reconnect_max_seconds = reconnect_max_seconds
        self._lock = Lock()
        self._connected = False
        self._started = False
        self._last_error: str | None = None
        self._subscriptions: dict[str, int] = {}
        self._messages: deque[MQTTMessageRecord] = deque(maxlen=message_buffer_size)
        factory = client_factory or mqtt.Client
        self._client = factory(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=client_id,
            protocol=mqtt.MQTTv311,
        )
        self._client.username_pw_set(username.strip(), password)
        if tls:
            self._client.tls_set()
        self._client.reconnect_delay_set(
            min_delay=reconnect_min_seconds,
            max_delay=reconnect_max_seconds,
        )
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    @property
    def connected(self) -> bool:
        with self._lock:
            return self._connected

    def start(self) -> None:
        with self._lock:
            if self._started:
                return
            self._started = True
        try:
            self._client.connect_async(self.host, self.port, self.keepalive_seconds)
            self._client.loop_start()
        except (OSError, ValueError) as exc:
            with self._lock:
                self._started = False
                self._last_error = f"Unable to start MQTT connection to {self.host}:{self.port}."
            raise MQTTUnavailableError(self._last_error) from exc

    def close(self) -> None:
        with self._lock:
            started = self._started
            self._started = False
            self._connected = False
        if started:
            try:
                self._client.disconnect()
            finally:
                self._client.loop_stop()

    def subscribe(self, topic_filter: str, qos: int = 0) -> tuple[str, int]:
        value = validate_topic_filter(topic_filter)
        if qos not in {0, 1}:
            raise MQTTTopicDeniedError("Build 025 supports MQTT subscription QoS 0 or 1.")
        if not _subscription_allowed(value, self.allowed_topics):
            raise MQTTTopicDeniedError("MQTT subscription is outside the configured topic allow list.")
        if not self.connected:
            raise MQTTUnavailableError("MQTT broker is not connected.")
        result, _mid = self._client.subscribe(value, qos=qos)
        if int(result) != int(mqtt.MQTT_ERR_SUCCESS):
            raise MQTTUnavailableError("MQTT broker rejected the subscription request.")
        with self._lock:
            self._subscriptions[value] = qos
        return value, qos

    def publish(self, topic: str, payload: str, qos: int = 0) -> int:
        value = validate_publish_topic(topic)
        if qos not in {0, 1}:
            raise MQTTTopicDeniedError("Build 025 supports MQTT publish QoS 0 or 1.")
        if not _matches_allowed_filter(value, self.allowed_topics):
            raise MQTTTopicDeniedError("MQTT publish topic is outside the configured topic allow list.")
        if not self.connected:
            raise MQTTUnavailableError("MQTT broker is not connected.")
        info = self._client.publish(value, payload=payload, qos=qos, retain=False)
        if int(info.rc) != int(mqtt.MQTT_ERR_SUCCESS):
            raise MQTTUnavailableError("MQTT broker rejected the publish request.")
        return int(info.mid)

    def messages(self, limit: int = 50) -> list[MQTTMessageRecord]:
        with self._lock:
            return list(self._messages)[-limit:]

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "connected": self._connected,
                "subscriptions": sorted(self._subscriptions),
                "message_count": len(self._messages),
                "last_error": self._last_error,
            }

    def _on_connect(self, _client: Any, _userdata: Any, _flags: Any, reason_code: Any, _properties: Any = None) -> None:
        success = _reason_value(reason_code) == 0
        with self._lock:
            self._connected = success
            self._last_error = None if success else "MQTT broker rejected the connection."
            subscriptions = list(self._subscriptions.items())
        if success:
            for topic_filter, qos in subscriptions:
                self._client.subscribe(topic_filter, qos=qos)

    def _on_disconnect(self, _client: Any, _userdata: Any, _disconnect_flags: Any, reason_code: Any, _properties: Any = None) -> None:
        with self._lock:
            self._connected = False
            if self._started and _reason_value(reason_code) != 0:
                self._last_error = "MQTT disconnected; automatic reconnect is active."

    def _on_message(self, _client: Any, _userdata: Any, message: Any) -> None:
        value = message.payload
        raw = value if isinstance(value, bytes) else str(value).encode("utf-8", errors="replace")
        record = MQTTMessageRecord(
            topic=str(message.topic),
            payload=raw[:65536].decode("utf-8", errors="replace"),
            qos=int(message.qos),
            retain=bool(message.retain),
            received_at=datetime.now(UTC).isoformat(),
        )
        with self._lock:
            self._messages.append(record)
