import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.business_connectors import (
    DEFAULT_BUSINESS_CONNECTORS,
    ConnectorRegistry,
    ConnectorUnavailableError,
    ConnectorWriteBlockedError,
)
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'business-connectors.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client


def test_default_registry_is_read_first_and_fail_closed() -> None:
    connectors = DEFAULT_BUSINESS_CONNECTORS.list()
    assert [connector.descriptor.key for connector in connectors] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]

    for connector in connectors:
        assert connector.descriptor.access_mode.value == "read_only"
        assert connector.descriptor.writes_require_confirmation is True
        assert connector.status().state.value == "planned"
        with pytest.raises(ConnectorUnavailableError):
            connector.read("example")
        with pytest.raises(ConnectorWriteBlockedError):
            connector.write("example", {"value": 1})


def test_registry_rejects_duplicate_connector_keys() -> None:
    connector = DEFAULT_BUSINESS_CONNECTORS.get("devilndove")
    registry = ConnectorRegistry((connector,))
    with pytest.raises(ValueError, match="already registered"):
        registry.register(connector)


def test_authenticated_business_catalogue_exposes_safe_metadata_only(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/v1/business/connectors")
    assert response.status_code == 200
    payload = response.json()

    assert payload["framework_version"] == "1"
    assert payload["read_only_default"] is True
    assert payload["write_confirmation_required"] is True
    assert [item["key"] for item in payload["connectors"]] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]
    assert all(item["status"]["state"] == "planned" for item in payload["connectors"])
    assert "token" not in str(payload).lower()
    assert "cookie" not in str(payload).lower()

    detail = client.get("/api/v1/business/connectors/devilndove")
    assert detail.status_code == 200
    assert detail.json()["planned_build"] == 37

    missing = client.get("/api/v1/business/connectors/not-a-connector")
    assert missing.status_code == 404

    assert client.post("/api/v1/business/connectors/devilndove").status_code == 405


def test_business_catalogue_requires_authentication(tmp_path) -> None:
    client = build_client(tmp_path)
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/business/connectors").status_code == 401
