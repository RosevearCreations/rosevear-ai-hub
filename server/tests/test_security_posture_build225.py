"""Build 225 negative authorization and redacted audit export checks."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def _clients(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'build225.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def session_override():
        with maker() as session:
            yield session

    app.dependency_overrides[get_session] = session_override
    return TestClient(app), TestClient(app), maker


def test_security_posture_is_passive_owner_only_and_reports_unknown_external_controls(tmp_path):
    owner, reader, _ = _clients(tmp_path)
    path = "/api/v1/system/security-posture"
    assert reader.get(path).status_code == 401
    assert (
        owner.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    created = owner.post(
        "/api/v1/auth/users",
        json={"username": "reader", "password": "reader-password-123", "role": "read_only"},
    )
    assert created.status_code == 201
    reader.post(
        "/api/v1/auth/login", json={"username": "reader", "password": "reader-password-123"}
    )
    assert reader.get(path).status_code == 403
    response = owner.get(path)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    body = response.json()
    assert body["role_counts"]["owner"]["enabled"] == 1
    assert body["role_counts"]["read_only"]["enabled"] == 1
    assert body["api_bind_scope"] == "loopback"
    assert body["reverse_proxy_tls"] == body["firewall"] == body["tailscale_acl"] == "not_inspected"
    assert body["network_probes_performed"] is False
    assert body["secret_values_read"] is False
    assert "owner-password-123" not in response.text


def test_review_csv_is_bounded_redacted_and_formula_safe(tmp_path):
    owner, reader, maker = _clients(tmp_path)
    path = "/api/v1/audit/review-export.csv"
    assert reader.get(path).status_code == 401
    owner.post(
        "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
    )
    owner.post(
        "/api/v1/auth/users",
        json={"username": "family", "password": "family-password-123", "role": "household_user"},
    )
    reader.post(
        "/api/v1/auth/login", json={"username": "family", "password": "family-password-123"}
    )
    assert reader.get(path).status_code == 403
    with maker() as db:
        record_audit_event(
            db,
            actor_user_id=None,
            event_type='=HYPERLINK("evil")',
            object_type="device",
            object_id="private-object-123",
            action="read",
            arguments={"password": "never-export"},
            result={"secret": "also-never-export"},
        )
        db.commit()
    response = owner.get(path + "?limit=2")
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-disposition"].endswith('"hub-audit-review-redacted.csv"')
    assert "'=HYPERLINK" in response.text
    for sensitive in (
        "never-export",
        "also-never-export",
        "private-object-123",
        "actor_user_id",
        "sanitized_arguments",
        "result,",
    ):
        assert sensitive not in response.text
    assert len(response.text.strip().splitlines()) == 3
    assert owner.get(path + "?limit=201").status_code == 422
