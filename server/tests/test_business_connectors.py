import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.business_connectors import (
    DEFAULT_BUSINESS_CONNECTORS,
    ConnectorConfigurationError,
    ConnectorOperationNotFoundError,
    ConnectorRegistry,
    ConnectorWriteBlockedError,
    DevilNDoveReadConnector,
    RosieDazzlersReadConnector,
    YardWorkersReadConnector,
)
from rosevear_ai_hub.config import Settings, get_settings
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'business-connectors.db'}")
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
    assert [connector.descriptor.key for connector in connectors] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]

    devilndove = DEFAULT_BUSINESS_CONNECTORS.get("devilndove")
    assert devilndove.descriptor.access_mode.value == "approved_write"
    assert devilndove.descriptor.writes_require_confirmation is True
    assert devilndove.status().state.value == "unconfigured"
    with pytest.raises(ConnectorConfigurationError):
        devilndove.read("catalogue")
    with pytest.raises(ConnectorConfigurationError):
        devilndove.write("story_draft", {"product_id": 1})

    rosiedazzlers = DEFAULT_BUSINESS_CONNECTORS.get("rosiedazzlers")
    assert rosiedazzlers.descriptor.access_mode.value == "read_only"
    assert rosiedazzlers.descriptor.writes_require_confirmation is True
    assert rosiedazzlers.status().state.value == "unconfigured"
    with pytest.raises(ConnectorConfigurationError):
        rosiedazzlers.read("bookings")
    with pytest.raises(ConnectorWriteBlockedError):
        rosiedazzlers.write("example", {"value": 1})

    yardworkers = DEFAULT_BUSINESS_CONNECTORS.get("yardworkers")
    assert yardworkers.descriptor.access_mode.value == "approved_write"
    assert yardworkers.descriptor.writes_require_confirmation is True
    assert yardworkers.status().state.value == "unconfigured"
    with pytest.raises(ConnectorConfigurationError):
        yardworkers.read("jobs")
    with pytest.raises(ConnectorConfigurationError):
        yardworkers.write("job_comment", {"job_id": 1})


def test_devilndove_connector_reads_bounded_catalogue() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.headers["Authorization"] == ("Bearer test-admin-credential")
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
    with pytest.raises(ConnectorOperationNotFoundError):
        connector.write(
            "product.update",
            {"product_id": 42},
        )


def test_rosiedazzlers_connector_reads_bounded_jobs() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.headers["Cookie"] == "rd_staff_session=test-staff-session"
        assert request.url.path == "/api/detailer/jobs"
        assert request.url.params["scope"] == "workspace"
        return httpx.Response(
            200,
            json={
                "ok": True,
                "jobs": [
                    {
                        "id": "booking-42",
                        "service_date": "2026-10-12",
                        "start_slot": "AM",
                        "status": "confirmed",
                        "job_status": "scheduled",
                        "current_workflow_stage": "arrival",
                        "customer_name": "Customer",
                        "package_code": "complete",
                        "vehicle_size": "medium",
                        "assigned_to": "Detailer",
                        "progress_enabled": True,
                    }
                ],
            },
        )

    connector = RosieDazzlersReadConnector(
        Settings(
            ROSIEDAZZLERS_BASE_URL="https://rosiedazzlers.ca",
            ROSIEDAZZLERS_TIMEOUT_SECONDS=2,
        ),
        credential="test-staff-session",
        transport=httpx.MockTransport(handler),
    )
    assert connector.status().state.value == "configured"

    result = connector.read("jobs.read", limit=500)
    assert result.resource == "jobs"
    assert result.next_cursor is None
    assert result.records[0]["booking_id"] == "booking-42"
    assert result.records[0]["workflow_stage"] == "arrival"
    with pytest.raises(ConnectorWriteBlockedError):
        connector.write(
            "booking.update",
            {"booking_id": "booking-42"},
        )


def test_yardworkers_connector_reads_bounded_equipment() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.headers["Authorization"] == "Bearer test-access-token"
        assert request.headers["apikey"] == "test-anon-key"
        assert request.url.path == "/functions/v1/core-data-read"
        return httpx.Response(
            200,
            json={
                "ok": True,
                "read_only": True,
                "data": {
                    "equipment": [
                        {
                            "id": "equipment-42",
                            "equipment_code": "EQ-42",
                            "item_name": "Commercial mower",
                            "equipment_category": "mower",
                            "is_active": True,
                        }
                    ]
                },
            },
        )

    connector = YardWorkersReadConnector(
        Settings(
            YARDWORKERS_BASE_URL="https://example.supabase.co",
            YARDWORKERS_TIMEOUT_SECONDS=2,
        ),
        access_token="test-access-token",
        anon_key="test-anon-key",
        transport=httpx.MockTransport(handler),
    )
    assert connector.status().state.value == "configured"

    result = connector.read("equipment.read", limit=500)
    assert result.resource == "equipment"
    assert result.next_cursor is None
    assert result.records[0]["equipment_id"] == "equipment-42"
    assert result.records[0]["item_name"] == "Commercial mower"
    with pytest.raises(ConnectorOperationNotFoundError):
        connector.write(
            "equipment.update",
            {"equipment_id": "equipment-42"},
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
    assert [item["key"] for item in payload["connectors"]] == [
        "devilndove",
        "rosiedazzlers",
        "yardworkers",
    ]
    states = {item["key"]: item["status"]["state"] for item in payload["connectors"]}
    assert states == {
        "devilndove": "unconfigured",
        "rosiedazzlers": "unconfigured",
        "yardworkers": "unconfigured",
    }
    assert "authorization" not in str(payload).lower()
    assert "cookie" not in str(payload).lower()

    detail = client.get("/api/v1/business/connectors/devilndove")
    assert detail.status_code == 200
    assert detail.json()["planned_build"] == 37

    missing = client.get("/api/v1/business/connectors/not-a-connector")
    assert missing.status_code == 404

    read_without_credential = client.get("/api/v1/business/connectors/devilndove/read/catalogue")
    assert read_without_credential.status_code == 503
    assert "not configured" in read_without_credential.json()["detail"].lower()

    post_response = client.post("/api/v1/business/connectors/devilndove")
    assert post_response.status_code == 405


def test_business_catalogue_requires_authentication(tmp_path) -> None:
    client = build_client(tmp_path)
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/business/connectors").status_code == 401
    assert client.get("/api/v1/business/connectors/devilndove/read/catalogue").status_code == 401


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
        response = client.get("/api/v1/business/connectors/devilndove")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"]["state"] == "configured"
        assert payload["status"]["configured"] is True
        assert "environment-admin-credential" not in str(payload)
    finally:
        get_settings.cache_clear()


def test_yardworkers_environment_credentials_mark_connector_configured(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv(
        "YARDWORKERS_ACCESS_TOKEN",
        "environment-access-token",
    )
    monkeypatch.setenv(
        "YARDWORKERS_ANON_KEY",
        "environment-anon-key",
    )
    get_settings.cache_clear()
    try:
        client = build_client(tmp_path)
        response = client.get("/api/v1/business/connectors/yardworkers")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"]["state"] == "configured"
        assert payload["status"]["configured"] is True
        assert "environment-access-token" not in str(payload)
        assert "environment-anon-key" not in str(payload)
    finally:
        get_settings.cache_clear()


def test_rosiedazzlers_environment_credential_marks_connector_configured(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv(
        "ROSIEDAZZLERS_STAFF_SESSION_TOKEN",
        "environment-staff-session",
    )
    get_settings.cache_clear()
    try:
        client = build_client(tmp_path)
        response = client.get("/api/v1/business/connectors/rosiedazzlers")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"]["state"] == "configured"
        assert payload["status"]["configured"] is True
        assert "environment-staff-session" not in str(payload)
    finally:
        get_settings.cache_clear()
