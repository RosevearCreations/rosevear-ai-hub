"""Build 068: bounded, non-sensitive integration failure categories.

No extra networking, connection attempt, credential inspection, retry, restart,
configuration write or MQTT publication is performed by these classifiers.
"""

from __future__ import annotations

from typing import Literal

from rosevear_ai_hub.integrations.home_assistant import (
    HomeAssistantAuthenticationError,
    HomeAssistantConfigurationError,
    HomeAssistantError,
    HomeAssistantRequestError,
    HomeAssistantTimeoutError,
    HomeAssistantUnavailableError,
)

RecoveryReason = Literal[
    "connected",
    "not_configured",
    "invalid_configuration",
    "timeout",
    "authentication_rejected",
    "unreachable",
    "unexpected_response",
    "starting_or_reconnecting",
    "broker_rejected_credentials",
    "broker_rejected_connection",
    "disconnected_reconnecting",
    "unknown",
]


def classify_home_assistant(
    *, configured: bool, error: HomeAssistantError | None = None
) -> RecoveryReason:
    if not configured:
        return "not_configured"
    if error is None:
        return "connected"
    if isinstance(error, HomeAssistantAuthenticationError):
        return "authentication_rejected"
    if isinstance(error, HomeAssistantTimeoutError):
        return "timeout"
    if isinstance(error, HomeAssistantUnavailableError):
        return "unreachable"
    if isinstance(error, HomeAssistantConfigurationError):
        return "invalid_configuration"
    if isinstance(error, HomeAssistantRequestError):
        return "unexpected_response"
    return "unknown"


def classify_mqtt(
    *,
    configured: bool,
    connected: bool,
    last_error: str | None,
) -> RecoveryReason:
    if not configured:
        return "not_configured"
    if connected:
        return "connected"
    # Match only strings emitted by this project's own MQTT callbacks;
    # never serialize raw error strings, broker addresses or credentials.
    if last_error == "MQTT broker rejected credentials.":
        return "broker_rejected_credentials"
    if last_error == "MQTT broker rejected the connection.":
        return "broker_rejected_connection"
    if last_error == "MQTT disconnected; automatic reconnect is active.":
        return "disconnected_reconnecting"
    if last_error is None:
        return "starting_or_reconnecting"
    return "unknown"
