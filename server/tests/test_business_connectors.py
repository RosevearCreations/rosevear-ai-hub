import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.business_connectors import (
    DEFAULT_BUSINESS_CONNECTORS,
    ConnectorConfigurationError,
    ConnectorRegistry,
    ConnectorUnavailableError,
    ConnectorWriteBlockedError,
    DevilNDoveReadConnector,
)
from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app


def build_client(tmp_path):
    engine = build_engine(
        f"sqlite:///{tmp_path / 'business-connectors.db'}"
    )
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(
        bind=engine,
        expire_on_commit=False,
    )

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={
            "username": "owner",
            "password": "owner-password-123",
        },
    )
    assert response.status_code == 201
    return client


def test_default_registry_is_read_first_and_fail_closed() -> None:
    connectors = DEFAULT_BUSINESS_CONNECTORS.list()
    assert [
        connector.descriptor.key
        for connector in connectors
    ] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]

    devilndove = DEFAULT_BUSINESS_CONNECTORS.get("devilndove")
    assert devilndove.descriptor.access_mode.value == "read_only"
    assert devilndove.descriptor.writes_require_confirmation is True
    assert devilndove.status().state.value == "unconfigured"
    with pytest.raises(ConnectorConfigurationError):
        devilndove.read("catalogue")
    with pytest.raises(ConnectorWriteBlockedError):
        devilndove.write("example", {"value": 1})

    for key in ("rosiedazzlers", "yardworkers"):
        connector = DEFAULT_BUSINESS_CONNECTORS.get(key)
        assert connector.descriptor.access_mode.value == "read_only"
        assert connector.descriptor.writes_require_confirmation is True
        assert connector.status().state.value == "planned"
        with pytest.raises(ConnectorUnavailableError):
            connector.read("example")
        with pytest.raises(ConnectorWriteBlockedError):
            connector.write("example", {"value": 1})


def test_devilndove_connector_reads_bounded_catalogue() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.headers["Authorization"] == (
            "Bearer test-admin-credential"
        )
        assert request.url.path == "/api/admin/product-picker"
        assert request.url.params["limit"] == "50"
        return httpx.Response(
            200,
            json={
                "ok": True,
                "products": [
                    {
                        "product_id": 42,
                        "name": "Copper Dove",
                        "slug": "copper-dove",
                        "sku": "DD-42",
                        "status": "active",
                        "updated_at": "2026-10-09T12:00:00Z",
                    }
                ],
                "pagination": {
                    "limit": 50,
                    "cursor": None,
                    "next_cursor": 41,
                    "has_more": True,
                },
            },
        )

    connector = DevilNDoveReadConnector(
        Settings(
            DEVILNDOVE_BASE_URL="https://devilndove.com",
            DEVILNDOVE_TIMEOUT_SECONDS=2,
        ),
        credential="test-admin-credential",
        transport=httpx.MockTransport(handler),
    )
    assert connector.status().state.value == "configured"

    result = connector.read("catalogue.read", limit=500)
    assert result.resource == "catalogue"
    assert result.next_cursor == "41"
    assert result.records[0]["product_id"] == 42
    assert result.records[0]["name"] == "Copper Dove"
    with pytest.raises(ConnectorWriteBlockedError):
        connector.write(
            "product.update",
            {"product_id": 42},
        )


def test_registry_rejects_duplicate_connector_keys() -> None:
    connector = DEFAULT_BUSINESS_CONNECTORS.get("devilndove")
    registry = ConnectorRegistry((connector,))
    with pytest.raises(ValueError, match="already registered"):
        registry.register(connector)


def test_authenticated_business_catalogue_is_safe(tmp_path) -> None:
    client = build_client(tmp_path)

    response = client.get("/api/v1/business/connectors")
    assert response.status_code == 200
    payload = response.json()

    assert payload["framework_version"] == "1"
    assert payload["read_only_default"] is True
    assert payload["write_confirmation_required"] is True
    assert [
        item["key"]
        for item in payload["connectors"]
    ] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]
    states = {
        item["key"]: item["status"]["state"]
        for item in payload["connectors"]
    }
    assert states == {
        "devilndove": "unconfigured",
        "rosiedazzlers": "planned",
        "yardworkers": "planned",
    }
    assert "authorization" not in str(payload).lower()
    assert "cookie" not in str(payload).lower()

    detail = client.get(
        "/api/v1/business/connectors/devilndove"
    )
    assert detail.status_code == 200
    assert detail.json()["planned_build"] == 37

    missing = client.get(
        "/api/v1/business/connectors/not-a-connector"
    )
    assert missing.status_code == 404

    read_without_credential = client.get(
        "/api/v1/business/connectors/devilndove/read/catalogue"
    )
    assert read_without_credential.status_code == 503
    assert (
        "not configured"
        in read_without_credential.json()["detail"].lower()
    )

    post_response = client.post(
        "/api/v1/business/connectors/devilndove"
    )
    assert post_response.status_code == 405


def test_business_catalogue_requires_authentication(tmp_path) -> None:
    client = build_client(tmp_path)
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get(
        "/api/v1/business/connectors"
    ).status_code == 401
    assert client.get(
        "/api/v1/business/connectors/devilndove/read/catalogue"
    ).status_code == 401


def test_environment_credential_marks_connector_configured(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv(
        "DEVILNDOVE_ADMIN_TOKEN",
        "environment-admin-credential",
    )
    get_settings.cache_clear()
    try:
        client = build_client(tmp_path)
        response = client.get(
            "/api/v1/business/connectors/devilndove"
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"]["state"] == "configured"
        assert payload["status"]["configured"] is True
        assert "environment-admin-credential" not in str(payload)
    finally:
        get_settings.cache_clear()
