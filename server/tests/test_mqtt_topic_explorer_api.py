"""Build 143: bounded, role-gated MQTT evidence and no-send previews."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.mqtt import MQTTRuntime, get_mqtt_runtime
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.integrations.mqtt import MQTTMessageRecord
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


class FakeMQTT:
    def __init__(self):
        self.publishes = []
        self.connected = True
        self.records = [
            self.record("rosevear/sensors/temp", "21.5", "2026-10-25T12:00:00+00:00"),
            self.record("rosevear/sensors/door", '{"state":"open"}', "2026-10-25T12:01:00+00:00"),
            self.record("rosevear/sensors/temp", "22.5", "2026-10-25T12:02:00+00:00"),
            self.record(
                "rosevear/sensors/private/token", "supersecret", "2026-10-25T12:03:00+00:00"
            ),
            self.record(
                "rosevear/sensors/raw", '{"token":"supersecret"}', "2026-10-25T12:04:00+00:00"
            ),
            self.record("rosevear/sensors/unclassified", "1234", "2026-10-25T12:04:30+00:00"),
            self.record("rosevear/sensors/passcode", "5678", "2026-10-25T12:04:40+00:00"),
            self.record("outside/sensors", "99", "2026-10-25T12:05:00+00:00"),
            self.record("rosevear/controls/unknown", "OPEN_LOCK", "2026-10-25T12:06:00+00:00"),
        ]

    @staticmethod
    def record(topic, payload, timestamp):
        return MQTTMessageRecord(topic, payload, 0, False, timestamp)

    def snapshot(self):
        return {"connected": self.connected, "subscriptions": ["rosevear/sensors/#"]}

    def messages(self, limit=50):
        return self.records[-limit:]

    def publish(self, topic, payload, qos=0):
        self.publishes.append((topic, payload, qos))
        return 1


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'mqtt-build143.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    fake = FakeMQTT()
    runtime = MQTTRuntime(
        client=fake,
        host="private.example",
        port=1883,
        tls=True,
        username_configured=True,
        password_configured=True,
        allowed_topics=("rosevear/#",),
        reconnect_min_seconds=1,
        reconnect_max_seconds=30,
    )

    def override_session():
        with sessions() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_mqtt_runtime] = lambda: runtime
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    return client, fake


def test_bounded_explorer_filters_subscription_secrets_and_payloads(tmp_path):
    client, fake = build_client(tmp_path)
    response = client.get("/api/v1/mqtt/topics/explorer?limit=3&namespace=rosevear/sensors")
    assert response.status_code == 200
    rows = response.json()["topics"]
    assert [row["topic"] for row in rows] == [
        "rosevear/sensors/unclassified",
        "rosevear/sensors/raw",
        "rosevear/sensors/temp",
    ]
    assert rows[0]["state_preview"] is None
    assert rows[0]["state_kind"] == "redacted"
    assert rows[1]["state_preview"] is None
    assert rows[2]["message_count"] == 2
    assert rows[2]["state_preview"] == "22.5"
    assert "supersecret" not in response.text
    assert "private/token" not in response.text
    assert "passcode" not in response.text
    assert "5678" not in response.text
    assert "outside/sensors" not in response.text
    assert "unknown" not in response.text
    assert fake.publishes == []

    legacy = client.get("/api/v1/mqtt/messages")
    assert legacy.status_code == 200
    assert all(row["payload"] == "[redacted]" for row in legacy.json())
    assert "supersecret" not in legacy.text
    assert all("private" not in row["topic"] for row in legacy.json())


def test_explorer_invalid_filters_and_read_only_denial(tmp_path):
    client, _fake = build_client(tmp_path)
    for namespace in ("rosevear/#", "rosevear/private", "rosevear/+/sensor", "../password"):
        assert (
            client.get("/api/v1/mqtt/topics/explorer", params={"namespace": namespace}).status_code
            == 422
        )
    assert client.get("/api/v1/mqtt/topics/explorer?limit=101").status_code == 422
    assert (
        client.post(
            "/api/v1/auth/users",
            json={"username": "reader", "password": "reader-password-123", "role": "read_only"},
        ).status_code
        == 201
    )
    other = TestClient(client.app)
    assert (
        other.post(
            "/api/v1/auth/login", json={"username": "reader", "password": "reader-password-123"}
        ).status_code
        == 200
    )
    assert other.get("/api/v1/mqtt/topics/explorer").status_code == 403
    assert (
        other.post(
            "/api/v1/mqtt/publish-preview", json={"topic": "rosevear/test", "payload": "on"}
        ).status_code
        == 403
    )


def test_publish_preview_is_explicit_policy_check_and_never_sends(tmp_path):
    client, fake = build_client(tmp_path)
    approved = client.post(
        "/api/v1/mqtt/publish-preview",
        json={
            "topic": "rosevear/sensors/temp",
            "payload": "21.5",
            "qos": 0,
        },
    )
    assert approved.status_code == 200
    assert approved.json()["allowed"] is True
    assert approved.json()["connected"] is True
    assert approved.json()["payload_bytes"] == 4
    assert len(approved.json()["payload_sha256"]) == 64
    assert "21.5" not in approved.text
    for topic in ("outside/temperature", "rosevear/private/token", "rosevear/sensors/#"):
        refused = client.post(
            "/api/v1/mqtt/publish-preview", json={"topic": topic, "payload": "on"}
        )
        assert refused.status_code == 200
        assert refused.json()["allowed"] is False
    assert (
        client.post(
            "/api/v1/mqtt/publish-preview",
            json={"topic": "rosevear/test", "payload": "on", "retain": True},
        ).status_code
        == 422
    )
    fake.connected = False
    offline = client.post(
        "/api/v1/mqtt/publish-preview", json={"topic": "rosevear/sensors/temp", "payload": "21.5"}
    )
    assert offline.json()["connected"] is False
    assert fake.publishes == []
