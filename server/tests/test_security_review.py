"""Build 049 threat-model regressions for browser exposure and session takeover."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def _client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'security-review.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    return app


def test_openapi_schema_and_interactive_docs_are_not_public(tmp_path):
    client = TestClient(_client(tmp_path))
    for path in ("/docs", "/redoc", "/openapi.json"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert response.headers["x-content-type-options"] == "nosniff"
    # Local tooling retains the schema; it is just not served over HTTP.
    assert "/api/v1/system/resource-budget" in client.app.openapi()["paths"]


def test_authenticated_api_responses_no_store_and_no_static_regression(tmp_path):
    client = TestClient(_client(tmp_path))
    public = client.get("/health")
    assert public.status_code == 200
    assert public.headers["x-frame-options"] == "DENY"
    assert public.headers["x-content-type-options"] == "nosniff"
    assert public.headers["referrer-policy"] == "no-referrer"
    assert "cache-control" not in public.headers

    protected = client.get("/api/v1/system/resource-budget")
    assert protected.status_code == 401
    assert protected.headers["cache-control"] == "no-store"

    client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "long-owner-security-test"},
    )
    profile = client.get("/api/v1/auth/me")
    assert profile.status_code == 200
    assert profile.headers["cache-control"] == "no-store"
    assert profile.headers["x-frame-options"] == "DENY"


def test_rotating_password_revokes_target_sessions_but_not_other_accounts(tmp_path):
    app = _client(tmp_path)
    owner = TestClient(app)
    family = TestClient(app)
    owner.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "old-owner-password-123"},
    )
    created = owner.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "old-family-password-123",
            "role": "household_user",
        },
    )
    assert created.status_code == 201
    assert family.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "old-family-password-123"},
    ).status_code == 200
    assert family.get("/api/v1/auth/me").status_code == 200

    changed = owner.patch(
        f"/api/v1/auth/users/{created.json()['id']}",
        json={"new_password": "new-family-password-456"},
    )
    assert changed.status_code == 200
    # Even a session previously authorized on another device is no longer valid.
    assert family.get("/api/v1/auth/me").status_code == 401
    assert owner.get("/api/v1/auth/me").status_code == 200
    assert family.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "old-family-password-123"},
    ).status_code == 401
    assert family.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "new-family-password-456"},
    ).status_code == 200


def test_self_password_rotation_expires_current_cookie_and_requires_login(tmp_path):
    client = TestClient(_client(tmp_path))
    boot = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "first-owner-password-123"},
    )
    assert boot.status_code == 201
    owner_id = boot.json()["id"]
    assert client.patch(
        f"/api/v1/auth/users/{owner_id}",
        json={"new_password": "next-owner-password-456"},
    ).status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "first-owner-password-123"},
    ).status_code == 401
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "next-owner-password-456"},
    ).status_code == 200
