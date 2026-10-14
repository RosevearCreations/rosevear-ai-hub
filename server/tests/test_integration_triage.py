"""Build 068 safe integration triage and non-disruptive recovery evidence."""

from rosevear_ai_hub.integration_triage import classify_home_assistant, classify_mqtt
from rosevear_ai_hub.integrations.home_assistant import (
    HomeAssistantAuthenticationError,
    HomeAssistantConfigurationError,
    HomeAssistantRequestError,
    HomeAssistantTimeoutError,
    HomeAssistantUnavailableError,
)
from rosevear_ai_hub.integrations.mqtt import MQTTClient


def test_ha_safe_reasons_are_specific_without_serializing_secrets() -> None:
    samples = [
        (None, "connected"),
        (HomeAssistantTimeoutError("token=dont-expose"), "timeout"),
        (HomeAssistantAuthenticationError("Bearer private-value"), "authentication_rejected"),
        (HomeAssistantUnavailableError("http://internal-vm/"), "unreachable"),
        (HomeAssistantConfigurationError("http://internal-vm/"), "invalid_configuration"),
        (HomeAssistantRequestError("raw sensitive response"), "unexpected_response"),
    ]
    for error, expected in samples:
        actual = classify_home_assistant(configured=True, error=error)
        assert actual == expected
        assert "http://" not in actual
        assert "private" not in actual
    assert classify_home_assistant(configured=False) == "not_configured"


def test_mqtt_safe_reasons_and_generic_errors() -> None:
    assert classify_mqtt(configured=False, connected=False, last_error=None) == "not_configured"
    assert classify_mqtt(configured=True, connected=True, last_error="secret") == "connected"
    assert (
        classify_mqtt(configured=True, connected=False, last_error=None)
        == "starting_or_reconnecting"
    )
    assert (
        classify_mqtt(
            configured=True,
            connected=False,
            last_error="MQTT broker rejected credentials.",
        )
        == "broker_rejected_credentials"
    )
    assert (
        classify_mqtt(
            configured=True,
            connected=False,
            last_error="MQTT broker rejected the connection.",
        )
        == "broker_rejected_connection"
    )
    assert (
        classify_mqtt(
            configured=True,
            connected=False,
            last_error="MQTT disconnected; automatic reconnect is active.",
        )
        == "disconnected_reconnecting"
    )
    assert (
        classify_mqtt(
            configured=True, connected=False, last_error="tcp://private-host password=secret"
        )
        == "unknown"
    )


class FakeMQTT:
    def __init__(self, *args, **kwargs) -> None:
        self.on_connect = None

    def username_pw_set(self, *args) -> None:
        pass

    def reconnect_delay_set(self, **kwargs) -> None:
        pass


def test_mqtt_rejection_callback_never_uses_untrusted_reason_text() -> None:
    client = MQTTClient(
        "broker.internal",
        1883,
        username="operator",
        password="SECRET",
        allowed_topics=("hub/#",),
        client_factory=FakeMQTT,
    )
    client._on_connect(None, None, None, 4)
    snapshot = client.snapshot()
    assert snapshot["connected"] is False
    assert snapshot["last_error"] == "MQTT broker rejected credentials."
    assert "SECRET" not in str(snapshot)
    client._on_connect(None, None, None, 1)
    assert client.snapshot()["last_error"] == "MQTT broker rejected the connection."
