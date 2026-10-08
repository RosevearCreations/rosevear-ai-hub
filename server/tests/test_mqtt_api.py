from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.mqtt import MQTTRuntime, get_mqtt_runtime
from rosevear_ai_hub.auth import require_authenticated
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.integrations.mqtt import MQTTMessageRecord
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, User


class FakeMQTTClient:
    def __init__(self) -> None:
        self.subscriptions = []
        self.publishes = []

    def snapshot(self):
        return {
            "connected": True,
            "subscriptions": [item[0] for item in self.subscriptions],
            "message_count": 1,
            "last_error": None,
        }

    def subscribe(self, topic_filter: str, qos: int = 0):
        self.subscriptions.append((topic_filter, qos))
        return topic_filter, qos

    def publish(self, topic: str, payload: str, qos: int = 0):
        self.publishes.append((topic, payload, qos))
        return 42

    def messages(self, limit: int = 50):
        return [
            MQTTMessageRecord(
                topic="rosevear/sensors/temp",
                payload="21.5",
                qos=0,
                retain=False,
                received_at="2026-10-08T02:00:00+00:00",
            )
        ][-limit:]


def build_test_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'mqtt-api.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    with session_maker() as session:
        owner = User(
            username="owner",
            password_hash="not-used-in-test",
            role="owner",
            enabled=True,
        )
        session.add(owner)
        session.commit()
        owner_id = owner.id

    fake = FakeMQTTClient()
    runtime = MQTTRuntime(
        client=fake,
        host="mqtt.test",
        port=1883,
        tls=False,
        username_configured=True,
        password_configured=True,
        allowed_topics=("rosevear/#",),
        reconnect_min_seconds=1,
        reconnect_max_seconds=30,
    )

    def override_session():
        with session_maker() as session:
            yield session

    actor = SimpleNamespace(id=owner_id, role="owner")
    application = create_app()
    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_mqtt_runtime] = lambda: runtime
    application.dependency_overrides[require_authenticated] = lambda: actor
    return TestClient(application), fake, session_maker


def test_mqtt_status_messages_subscribe_publish_and_audit(tmp_path) -> None:
    client, fake, session_maker = build_test_client(tmp_path)
    response = client.get("/api/v1/mqtt/status")
    assert response.status_code == 200
    assert response.json()["available"] is True
    assert "secret" not in response.text

    response = client.get("/api/v1/mqtt/messages")
    assert response.json()[0]["topic"] == "rosevear/sensors/temp"

    response = client.post(
        "/api/v1/mqtt/subscriptions",
        json={"topic_filter": "rosevear/sensors/#", "qos": 0},
    )
    assert response.status_code == 200
    assert fake.subscriptions[-1] == ("rosevear/sensors/#", 0)

    response = client.post(
        "/api/v1/mqtt/publish",
        json={"topic": "rosevear/test", "payload": "hello-secret-ish-data", "qos": 0},
    )
    assert response.status_code == 200
    assert response.json()["message_id"] == 42

    with session_maker() as session:
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "mqtt.publish.completed")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        serialized = str(event.sanitized_arguments)
        assert "hello-secret-ish-data" not in serialized
        assert "payload_sha256" in serialized


def test_retained_publish_is_rejected_by_schema(tmp_path) -> None:
    client, fake, _session_maker = build_test_client(tmp_path)
    response = client.post(
        "/api/v1/mqtt/publish",
        json={"topic": "rosevear/test", "payload": "hello", "retain": True},
    )
    assert response.status_code == 422
    assert fake.publishes == []
