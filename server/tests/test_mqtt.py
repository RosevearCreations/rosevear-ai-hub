from types import SimpleNamespace

import pytest
from paho.mqtt import client as mqtt

from rosevear_ai_hub.integrations.mqtt import (
    MQTTClient,
    MQTTConfigurationError,
    MQTTTopicDeniedError,
    MQTTUnavailableError,
    validate_publish_topic,
    validate_topic_filter,
)


class FakePahoClient:
    def __init__(self, *_args, **_kwargs) -> None:
        self.on_connect = None
        self.on_disconnect = None
        self.on_message = None
        self.connected_to = None
        self.credentials = None
        self.reconnect_delay = None
        self.subscriptions = []
        self.publishes = []
        self.next_mid = 1

    def username_pw_set(self, username, password) -> None:
        self.credentials = (username, password)

    def tls_set(self) -> None:
        pass

    def reconnect_delay_set(self, min_delay, max_delay) -> None:
        self.reconnect_delay = (min_delay, max_delay)

    def connect_async(self, host, port, keepalive) -> None:
        self.connected_to = (host, port, keepalive)

    def loop_start(self) -> None:
        pass

    def loop_stop(self) -> None:
        pass

    def disconnect(self) -> None:
        pass

    def subscribe(self, topic_filter, qos=0):
        self.subscriptions.append((topic_filter, qos))
        self.next_mid += 1
        return mqtt.MQTT_ERR_SUCCESS, self.next_mid

    def publish(self, topic, payload, qos=0, retain=False):
        self.publishes.append((topic, payload, qos, retain))
        self.next_mid += 1
        return SimpleNamespace(rc=mqtt.MQTT_ERR_SUCCESS, mid=self.next_mid)

    def trigger_connect(self) -> None:
        self.on_connect(self, None, None, 0, None)

    def trigger_disconnect(self) -> None:
        self.on_disconnect(self, None, None, 1, None)

    def trigger_message(self, topic: str, payload: bytes) -> None:
        message = SimpleNamespace(topic=topic, payload=payload, qos=0, retain=False)
        self.on_message(self, None, message)


def build_client():
    holder = {}

    def factory(*args, **kwargs):
        client = FakePahoClient(*args, **kwargs)
        holder["client"] = client
        return client

    integration = MQTTClient(
        "mqtt.local",
        1883,
        username="hub",
        password="secret",
        allowed_topics=("rosevear/#", "shared/+/state"),
        reconnect_min_seconds=2,
        reconnect_max_seconds=20,
        client_factory=factory,
    )
    return integration, holder["client"]


def test_topic_validation_is_fail_closed() -> None:
    assert validate_topic_filter("rosevear/#") == "rosevear/#"
    assert validate_publish_topic("rosevear/test") == "rosevear/test"
    with pytest.raises(MQTTConfigurationError):
        validate_topic_filter("rosevear/#/bad")
    with pytest.raises(MQTTTopicDeniedError):
        validate_publish_topic("rosevear/+/set")


def test_authenticated_start_allowlist_publish_subscribe_and_messages() -> None:
    integration, client = build_client()
    integration.start()
    assert client.credentials == ("hub", "secret")
    assert client.reconnect_delay == (2, 20)
    assert client.connected_to == ("mqtt.local", 1883, 60)

    with pytest.raises(MQTTUnavailableError):
        integration.publish("rosevear/test", "before-connect")

    client.trigger_connect()
    assert integration.subscribe("rosevear/sensors/temp", 0) == ("rosevear/sensors/temp", 0)
    message_id = integration.publish("rosevear/test", "hello", 1)
    assert message_id > 0
    assert client.publishes[-1] == ("rosevear/test", "hello", 1, False)

    client.trigger_message("rosevear/sensors/temp", b"21.5")
    assert integration.messages()[-1].payload == "21.5"

    with pytest.raises(MQTTTopicDeniedError):
        integration.publish("outside/test", "blocked")
    with pytest.raises(MQTTTopicDeniedError):
        integration.subscribe("rosevear/+", 0)


def test_reconnect_restores_authorized_subscriptions() -> None:
    integration, client = build_client()
    integration.start()
    client.trigger_connect()
    integration.subscribe("rosevear/sensors/temp", 0)
    initial_count = len(client.subscriptions)
    client.trigger_disconnect()
    assert integration.snapshot()["connected"] is False
    client.trigger_connect()
    assert len(client.subscriptions) == initial_count + 1
    assert client.subscriptions[-1] == ("rosevear/sensors/temp", 0)
