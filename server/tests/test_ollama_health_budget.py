"""Build 220: owner opt-in local resource readback and failure boundaries."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.ollama import get_ollama_client
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.integrations.ollama import OllamaTimeoutError, OllamaUnavailableError
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


class FakeLocalModels:
    calls: list[str] = []

    async def version(self):
        self.calls.append("version")
        return "0.12.0"

    async def models(self):
        self.calls.append("models")
        return [
            {
                "name": "tiny:q4",
                "size": 1024,
                "details": {"parameter_size": "1B", "quantization_level": "Q4"},
            }
        ]

    async def running_models(self):
        self.calls.append("ps")
        return [{"name": "tiny:q4", "size": 2048, "size_vram": 512}]

    async def test_model(self, _model):
        raise AssertionError("Health sampling must not generate text")


class OfflineModels(FakeLocalModels):
    async def version(self):
        raise OllamaUnavailableError("offline")


class TimedOutResidentModels(FakeLocalModels):
    async def running_models(self):
        raise OllamaTimeoutError("resident check timed out")


def _client(tmp_path, adapter):
    engine = build_engine(f"sqlite:///{tmp_path / 'ollama-health.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_ollama_client] = adapter
    return TestClient(app)


def test_owner_requested_health_snapshot_is_read_only(tmp_path, monkeypatch):
    FakeLocalModels.calls = []
    client = _client(tmp_path, FakeLocalModels)
    address = "/api/v1/models/ollama/health-budget"
    assert client.get(address).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "local-model-owner-123"},
        ).status_code
        == 201
    )
    monkeypatch.setattr(
        "rosevear_ai_hub.api.ollama.collect_resource_snapshot",
        lambda: {"status": "attention", "host_memory": {"available_bytes": 1024}},
    )
    result = client.get(address)
    assert result.status_code == 200
    assert result.headers["cache-control"] == "no-store"
    data = result.json()
    assert data["inventory_state"] == "available"
    assert data["models"][0] == {
        "name": "tiny:q4",
        "size_bytes": 1024,
        "parameter_size": "1B",
        "quantization": "Q4",
    }
    assert data["installed_disk_size_sum_bytes"] == 1024
    assert data["resident_models"][0]["vram_bytes"] == 512
    assert data["automatic_downloads"] is False
    assert data["no_background_polling"] is True
    assert FakeLocalModels.calls == ["version", "models", "ps"]
    assert (
        client.post(
            "/api/v1/auth/users",
            json={"username": "family", "password": "family-model-secret-123", "role": "read_only"},
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "family", "password": "family-model-secret-123"}
        ).status_code
        == 200
    )
    assert client.get(address).status_code == 403


def test_offline_inventory_is_unknown_not_empty(tmp_path):
    client = _client(tmp_path, OfflineModels)
    client.post(
        "/api/v1/auth/bootstrap", json={"username": "owner", "password": "local-model-owner-123"}
    )
    data = client.get("/api/v1/models/ollama/health-budget").json()
    assert data["inventory_state"] == "unavailable"
    assert data["installed_disk_size_sum_bytes"] is None
    assert data["resident_state"] == "unknown"


def test_resident_timeout_keeps_inventory_but_marks_residency_unknown(tmp_path):
    client = _client(tmp_path, TimedOutResidentModels)
    client.post(
        "/api/v1/auth/bootstrap", json={"username": "owner", "password": "local-model-owner-123"}
    )
    data = client.get("/api/v1/models/ollama/health-budget").json()
    assert data["inventory_state"] == "available"
    assert data["resident_state"] == "unknown"
    assert data["resident_models"] == []
