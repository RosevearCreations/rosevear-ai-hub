import base64
import os

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.config import get_settings
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, Base, SecretValue
from rosevear_ai_hub.secrets import key_fingerprint, resolve_secret


def new_key() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).decode("ascii").rstrip("=")


def build_client(tmp_path, monkeypatch, *, current_key: str | None = None, previous_key: str | None = None):
    if current_key is None:
        monkeypatch.delenv("SECRET_ENCRYPTION_KEY", raising=False)
    else:
        monkeypatch.setenv("SECRET_ENCRYPTION_KEY", current_key)
    if previous_key is None:
        monkeypatch.delenv("SECRET_ENCRYPTION_PREVIOUS_KEY", raising=False)
    else:
        monkeypatch.setenv("SECRET_ENCRYPTION_PREVIOUS_KEY", previous_key)
    monkeypatch.delenv("HOME_ASSISTANT_TOKEN", raising=False)
    monkeypatch.delenv("MQTT_PASSWORD", raising=False)
    get_settings.cache_clear()

    engine = build_engine(f"sqlite:///{tmp_path / 'secrets.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert bootstrap.status_code == 201
    return client, session_maker


def test_encrypted_store_never_persists_or_returns_plaintext(tmp_path, monkeypatch) -> None:
    key = new_key()
    client, session_maker = build_client(tmp_path, monkeypatch, current_key=key)
    plaintext = "ha-token-with-sensitive-value"

    saved = client.put(
        "/api/v1/secrets/home_assistant.token",
        json={"value": plaintext},
    )
    assert saved.status_code == 200
    payload = saved.json()
    assert payload["configured"] is True
    assert payload["effective_source"] == "encrypted_store"
    assert payload["encrypted_store_configured"] is True
    assert "value" not in payload
    assert plaintext not in saved.text

    status = client.get("/api/v1/secrets")
    assert status.status_code == 200
    assert plaintext not in status.text
    assert status.json()["encryption_available"] is True

    with session_maker() as session:
        record = session.scalar(
            select(SecretValue).where(SecretValue.secret_key == "home_assistant.token")
        )
        assert record is not None
        assert plaintext not in record.ciphertext
        assert record.ciphertext.startswith("v1:")
        assert record.key_fingerprint == key_fingerprint(
            base64.urlsafe_b64decode(key + "=" * (-len(key) % 4))
        )
        assert resolve_secret(session, "home_assistant.token") == plaintext

        audit_events = session.scalars(
            select(AuditEvent).where(AuditEvent.object_type == "secret")
        ).all()
        assert audit_events
        assert all(plaintext not in str(event.sanitized_arguments) for event in audit_events)
        assert all(plaintext not in str(event.result) for event in audit_events)


def test_environment_secret_takes_precedence_without_redisplay(tmp_path, monkeypatch) -> None:
    key = new_key()
    client, session_maker = build_client(tmp_path, monkeypatch, current_key=key)
    assert (
        client.put(
            "/api/v1/secrets/home_assistant.token",
            json={"value": "stored-value"},
        ).status_code
        == 200
    )

    monkeypatch.setenv("HOME_ASSISTANT_TOKEN", "environment-value")
    get_settings.cache_clear()

    status = client.get("/api/v1/secrets")
    assert status.status_code == 200
    item = next(
        value for value in status.json()["secrets"]
        if value["secret_key"] == "home_assistant.token"
    )
    assert item["configured"] is True
    assert item["effective_source"] == "environment"
    assert item["environment_configured"] is True
    assert item["encrypted_store_configured"] is True
    assert "environment-value" not in status.text
    assert "stored-value" not in status.text

    with session_maker() as session:
        assert resolve_secret(session, "home_assistant.token") == "environment-value"


def test_store_is_locked_without_master_key(tmp_path, monkeypatch) -> None:
    client, _ = build_client(tmp_path, monkeypatch)

    response = client.put(
        "/api/v1/secrets/home_assistant.token",
        json={"value": "cannot-store"},
    )
    assert response.status_code == 503
    assert "SECRET_ENCRYPTION_KEY" in response.json()["detail"]


def test_secret_rotation_and_master_key_rewrap(tmp_path, monkeypatch) -> None:
    old_key = new_key()
    new_master_key = new_key()
    client, session_maker = build_client(tmp_path, monkeypatch, current_key=old_key)

    first = client.put(
        "/api/v1/secrets/home_assistant.token",
        json={"value": "first-value"},
    )
    assert first.status_code == 200

    rotated = client.put(
        "/api/v1/secrets/home_assistant.token",
        json={"value": "second-value"},
    )
    assert rotated.status_code == 200

    monkeypatch.setenv("SECRET_ENCRYPTION_KEY", new_master_key)
    monkeypatch.setenv("SECRET_ENCRYPTION_PREVIOUS_KEY", old_key)
    get_settings.cache_clear()

    rewrapped = client.post("/api/v1/secrets/rewrap")
    assert rewrapped.status_code == 200
    assert rewrapped.json()["rewrapped"] == 1

    monkeypatch.delenv("SECRET_ENCRYPTION_PREVIOUS_KEY", raising=False)
    get_settings.cache_clear()

    with session_maker() as session:
        record = session.scalar(select(SecretValue))
        assert record is not None
        assert resolve_secret(session, "home_assistant.token") == "second-value"
        expected = key_fingerprint(
            base64.urlsafe_b64decode(new_master_key + "=" * (-len(new_master_key) % 4))
        )
        assert record.key_fingerprint == expected


def test_delete_removes_only_encrypted_copy(tmp_path, monkeypatch) -> None:
    key = new_key()
    client, session_maker = build_client(tmp_path, monkeypatch, current_key=key)
    client.put("/api/v1/secrets/mqtt.password", json={"value": "mqtt-secret"})

    deleted = client.delete("/api/v1/secrets/mqtt.password")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}

    with session_maker() as session:
        assert session.scalar(select(SecretValue)) is None
        assert resolve_secret(session, "mqtt.password") is None


def test_household_user_cannot_administer_secrets(tmp_path, monkeypatch) -> None:
    client, _ = build_client(tmp_path, monkeypatch, current_key=new_key())
    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "family", "password": "family-password-123"},
        ).status_code
        == 200
    )

    assert client.get("/api/v1/secrets").status_code == 403
    assert (
        client.put(
            "/api/v1/secrets/home_assistant.token",
            json={"value": "not-allowed"},
        ).status_code
        == 403
    )
    assert client.post("/api/v1/secrets/rewrap").status_code == 403
