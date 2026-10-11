"""Read-only resource sampling, warning boundaries and protected exposure."""

from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub import resource_budget
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def test_resource_budget_is_deterministic_and_only_exposes_coarse_totals(monkeypatch):
    monkeypatch.setattr(
        resource_budget.psutil,
        "Process",
        lambda: SimpleNamespace(
            memory_info=lambda: SimpleNamespace(rss=250 * resource_budget.MIB),
            cpu_times=lambda: SimpleNamespace(user=1.3, system=2.5),
        ),
    )
    monkeypatch.setattr(
        resource_budget.psutil,
        "virtual_memory",
        lambda: SimpleNamespace(total=16 * resource_budget.GIB, available=6 * resource_budget.GIB),
    )
    monkeypatch.setattr(
        resource_budget.shutil,
        "disk_usage",
        lambda _path: SimpleNamespace(
            total=100 * resource_budget.GIB, free=30 * resource_budget.GIB
        ),
    )
    result = resource_budget.collect_resource_snapshot()
    assert result["status"] == "within_guidelines"
    assert result["signals"] == []
    assert result["api_process"]["rss_bytes"] == 250 * resource_budget.MIB
    assert result["api_process"]["cpu_seconds_total"] == 3.8
    assert result["scope"] == "api_process_and_host"
    assert "paths" not in result
    assert "processes" not in result
    assert "tokens" not in str(result).lower()


def test_resource_budget_guidelines_flag_only_documented_conditions(monkeypatch):
    monkeypatch.setattr(
        resource_budget.psutil,
        "Process",
        lambda: SimpleNamespace(
            memory_info=lambda: SimpleNamespace(rss=resource_budget.API_RSS_WARNING_BYTES),
            cpu_times=lambda: SimpleNamespace(user=0.0, system=0.0),
        ),
    )
    monkeypatch.setattr(
        resource_budget.psutil,
        "virtual_memory",
        lambda: SimpleNamespace(total=8 * resource_budget.GIB, available=resource_budget.GIB),
    )
    monkeypatch.setattr(
        resource_budget.shutil,
        "disk_usage",
        lambda _path: SimpleNamespace(total=100 * resource_budget.GIB, free=resource_budget.GIB),
    )
    result = resource_budget.collect_resource_snapshot()
    assert result["status"] == "attention"
    assert result["signals"] == ["api_memory", "host_memory", "workspace_disk"]


def test_resource_endpoint_only_owner_and_administrator(tmp_path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'resource-roles.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def session_override():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    client = TestClient(app)
    address = "/api/v1/system/resource-budget"
    assert client.get(address).status_code == 401

    owner = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "budget-owner-secret-123"},
    )
    assert owner.status_code == 201
    monkeypatch.setattr(
        "rosevear_ai_hub.api.resources.collect_resource_snapshot",
        lambda: {"status": "within_guidelines", "signals": []},
    )
    response = client.get(address)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["status"] == "within_guidelines"

    added = client.post(
        "/api/v1/auth/users",
        json={
            "username": "family",
            "password": "family-budget-secret-123",
            "role": "household_user",
        },
    )
    assert added.status_code == 201
    client.post("/api/v1/auth/logout")
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "family-budget-secret-123"},
    ).status_code == 200
    assert client.get(address).status_code == 403
    client.post("/api/v1/auth/logout")
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "owner", "password": "budget-owner-secret-123"},
    ).status_code == 200
    family_id = added.json()["id"]
    promote = client.patch(
        f"/api/v1/auth/users/{family_id}", json={"role": "administrator"}
    )
    assert promote.status_code == 200
    client.post("/api/v1/auth/logout")
    assert client.post(
        "/api/v1/auth/login",
        json={"username": "family", "password": "family-budget-secret-123"},
    ).status_code == 200
    assert client.get(address).status_code == 200
