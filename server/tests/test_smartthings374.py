"""Build 374: scoped vendor GETs, fail-closed source and owner-only review."""

from __future__ import annotations

import asyncio
from copy import deepcopy

import httpx
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.home_assistant import HomeAssistantRuntime, get_home_assistant_runtime
from rosevear_ai_hub.api.smartthings374 import get_smartthings_client
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.integrations.smartthings374 import (
    SmartThingsReadClient,
    SmartThingsReadError,
)
from rosevear_ai_hub.main import create_app


class FakeSmartThings:
    def __init__(self):
        self.calls = []
        self.fail = None
        self.devices = [
            {
                "deviceId": "st-one", "label": "Office Light", "locationId": "home",
                "roomId": "office", "type": "HUB",
            },
            {
                "deviceId": "st-two", "label": "Office Light", "locationId": "home",
                "roomId": "office", "type": "LAN",
            },
        ]

    async def snapshot(self):
        if self.fail:
            raise SmartThingsReadError(self.fail)
        self.calls.append("GET_ONLY")
        return {
            "locations": [{"locationId": "home", "name": "House"}],
            "rooms": [
                {"sourceLocationId": "home", "roomId": "office", "name": "Office"}
            ],
            "devices": deepcopy(self.devices),
        }


class FakeHA:
    async def registry_snapshot(self):
        return {
            "devices": [
                {
                    "id": "ha-one", "name": "Office Light",
                    "identifiers": [["smartthings", "st-one"]],
                },
                {"id": "ha-two", "name": "Office Light", "identifiers": []},
            ]
        }


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'st374.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()
    fake = FakeSmartThings()

    def db_override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_session] = db_override
    app.dependency_overrides[get_smartthings_client] = lambda: fake
    app.dependency_overrides[get_home_assistant_runtime] = lambda: HomeAssistantRuntime(
        client=FakeHA(), base_url="http://ha.test",
        url_configured=True, token_configured=True,
    )
    client = TestClient(app)
    assert client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    ).status_code == 201
    return client, fake


def test_inspect_and_review_do_not_modify_vendor(tmp_path):
    client, fake = setup(tmp_path)
    path = "/api/v1/smartthings-374"
    response = client.post(path + "/inspect")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["deviceCount"] == 2
    assert data["locationCount"] == 1
    assert data["roomCount"] == 1
    assert data["exactHaCount"] == 1
    assert data["nameOnlyCount"] == 1
    assert data["duplicateNameCount"] == 2
    assert data["commandsSent"] == 0
    assert data["androidTizenVerified"] is False
    assert client.get(path + "/report").json()["lastDeviceCount"] == 2
    payload = {
        "device_id": "st-one", "decision": "reviewed",
        "expected_revision": 0, "owner_confirmed": True,
    }
    assert client.put(
        path + "/review", json={**payload, "owner_confirmed": False}
    ).status_code == 422
    good = client.put(path + "/review", json=payload)
    assert good.status_code == 200, good.text
    assert good.json()["localOnly"] is True
    assert client.put(path + "/review", json=payload).status_code == 409
    fake.fail = "HOLD_VENDOR_OFFLINE"
    assert client.post(path + "/inspect").status_code == 503
    assert client.put(path + "/review", json={
        "device_id": "st-one", "decision": "excluded",
        "expected_revision": 1, "owner_confirmed": True,
    }).status_code == 200
    assert fake.calls == ["GET_ONLY", "GET_ONLY"]


def test_duplicate_identity_fails_closed(tmp_path):
    client, fake = setup(tmp_path)
    fake.devices.append(deepcopy(fake.devices[0]))
    assert client.post("/api/v1/smartthings-374/inspect").status_code == 422


def test_non_owner_forbidden(tmp_path):
    client, fake = setup(tmp_path)
    assert client.post("/api/v1/auth/users", json={
        "username": "viewer", "password": "viewer-password-123", "role": "read_only",
    }).status_code == 201
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.post("/api/v1/auth/login", json={
        "username": "viewer", "password": "viewer-password-123",
    }).status_code == 200
    path = "/api/v1/smartthings-374"
    assert client.get(path + "/report").status_code == 403
    assert client.post(path + "/inspect").status_code == 403
    assert client.put(path + "/review", json={
        "device_id": "st-one", "decision": "reviewed",
        "expected_revision": 0, "owner_confirmed": True,
    }).status_code == 403
    assert client.post(
        path + "/disconnect", json={"owner_confirmed": True}
    ).status_code == 403
    assert fake.calls == []


def test_samsung_client_uses_only_fixed_gets():
    requests = []

    def handle(request: httpx.Request) -> httpx.Response:
        requests.append((request.method, str(request.url)))
        assert request.headers["Authorization"] == "Bearer sample-read-token"
        if request.url.path == "/v1/locations":
            return httpx.Response(200, json={
                "items": [{"locationId": "home", "name": "House"}],
            })
        if request.url.path == "/v1/devices":
            return httpx.Response(200, json={"items": [{"deviceId": "st-one"}]})
        if request.url.path == "/v1/locations/home/rooms":
            return httpx.Response(200, json={"items": []})
        return httpx.Response(500)

    instance = SmartThingsReadClient(
        "sample-read-token", transport=httpx.MockTransport(handle)
    )
    result = asyncio.run(instance.snapshot())
    assert len(result["devices"]) == 1
    assert len(requests) == 3
    assert all(method == "GET" for method, _ in requests)
    assert all("sample-read-token" not in url for _, url in requests)


def test_vendor_rejects_unsafe_page_and_expired_token():
    def unsafe(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={
            "items": [],
            "_links": {"next": {"href": "https://other.invalid/v1/locations"}},
        })

    instance = SmartThingsReadClient(
        "secret", transport=httpx.MockTransport(unsafe)
    )
    try:
        asyncio.run(instance.snapshot())
        assert False, "Unsafe cross-origin page should fail."
    except SmartThingsReadError as exc:
        assert str(exc) == "HOLD_UNSAFE_PAGINATION"
        assert "secret" not in str(exc)

    def expired(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"details": "unexpected bearer secret"})

    instance = SmartThingsReadClient(
        "secret", transport=httpx.MockTransport(expired)
    )
    try:
        asyncio.run(instance.snapshot())
        assert False, "401 should fail."
    except SmartThingsReadError as exc:
        assert str(exc) == "HOLD_TOKEN_EXPIRED"
        assert "secret" not in str(exc)
