from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.auth import SESSION_COOKIE_NAME, hash_password, verify_password
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base, Conversation, HubSession, User


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'auth.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    return TestClient(application), session_maker


def test_password_hash_is_argon2_and_verifies() -> None:
    encoded = hash_password("a-long-local-password")
    assert encoded.startswith("$argon2")
    assert "a-long-local-password" not in encoded
    assert verify_password(encoded, "a-long-local-password") is True
    assert verify_password(encoded, "wrong-password") is False


def test_owner_bootstrap_session_and_protected_api(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)

    status = client.get("/api/v1/auth/status")
    assert status.status_code == 200
    assert status.json()["bootstrap_required"] is True

    bootstrap = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "Owner", "password": "correct-horse-battery"},
    )
    assert bootstrap.status_code == 201
    assert bootstrap.json()["username"] == "owner"
    assert bootstrap.json()["role"] == "owner"
    assert client.cookies.get(SESSION_COOKIE_NAME)

    with session_maker() as session:
        owner = session.scalar(select(User).where(User.username == "owner"))
        assert owner is not None
        assert owner.password_hash != "correct-horse-battery"
        assert verify_password(owner.password_hash, "correct-horse-battery")
        stored_session = session.scalar(select(HubSession))
        assert stored_session is not None
        assert client.cookies.get(SESSION_COOKIE_NAME) != stored_session.token_hash

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "owner"

    client.cookies.clear()
    protected = client.get("/api/v1/models/profiles")
    assert protected.status_code == 401

    login = client.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "correct-horse-battery"},
    )
    assert login.status_code == 200
    assert client.get("/api/v1/models/profiles").status_code == 200

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    assert client.get("/api/v1/models/profiles").status_code == 401


def test_bootstrap_adopts_pre_auth_conversations(tmp_path) -> None:
    client, session_maker = build_client(tmp_path)

    with session_maker() as session:
        legacy = User(
            username="__local_pre_auth__",
            password_hash="AUTH_NOT_CONFIGURED",
            role="owner",
            enabled=True,
        )
        session.add(legacy)
        session.flush()
        conversation = Conversation(user_id=legacy.id, title="Earlier local chat", provider="ollama")
        session.add(conversation)
        session.commit()
        conversation_id = conversation.id

    assert client.get("/api/v1/auth/status").json()["bootstrap_required"] is True
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "ree", "password": "twelve-characters-plus"},
    )
    assert response.status_code == 201

    with session_maker() as session:
        assert session.scalar(
            select(User).where(User.username == "__local_pre_auth__")
        ) is None
        owner = session.scalar(select(User).where(User.username == "ree"))
        adopted = session.get(Conversation, conversation_id)
        assert owner is not None
        assert adopted is not None
        assert adopted.user_id == owner.id


def test_owner_user_management_and_last_owner_guard(tmp_path) -> None:
    client, _ = build_client(tmp_path)
    client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )

    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201
    family_id = created.json()["id"]

    updated = client.patch(
        f"/api/v1/auth/users/{family_id}",
        json={"role": "read_only", "enabled": False},
    )
    assert updated.status_code == 200
    assert updated.json()["role"] == "read_only"
    assert updated.json()["enabled"] is False

    owner_id = client.get("/api/v1/auth/me").json()["id"]
    blocked = client.patch(
        f"/api/v1/auth/users/{owner_id}",
        json={"enabled": False},
    )
    assert blocked.status_code == 409
    assert "one enabled owner" in blocked.json()["detail"]


def test_administrator_cannot_create_or_manage_privileged_accounts(tmp_path) -> None:
    client, _ = build_client(tmp_path)
    client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    admin = client.post(
        "/api/v1/auth/users",
        json={
            "username": "admin",
            "password": "admin-password-123",
            "role": "administrator",
        },
    )
    assert admin.status_code == 201

    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin-password-123"},
        ).status_code
        == 200
    )

    forbidden = client.post(
        "/api/v1/auth/users",
        json={
            "username": "otheradmin",
            "password": "other-admin-password",
            "role": "administrator",
        },
    )
    assert forbidden.status_code == 403


def test_read_only_account_cannot_change_application_state(tmp_path) -> None:
    client, _ = build_client(tmp_path)
    client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    created = client.post(
        "/api/v1/auth/users",
        json={
            "username": "viewer",
            "password": "viewer-password-123",
            "role": "read_only",
        },
    )
    assert created.status_code == 201

    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "viewer-password-123"},
        ).status_code
        == 200
    )

    assert client.get("/api/v1/models/profiles").status_code == 200
    blocked = client.post(
        "/api/v1/chat/conversations",
        json={"title": "Blocked write", "provider": "ollama"},
    )
    assert blocked.status_code == 403
    assert "Read-only" in blocked.json()["detail"]
