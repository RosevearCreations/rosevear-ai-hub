import json

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

import rosevear_ai_hub.api.business as business_api
from rosevear_ai_hub.business_connectors import (
    ConnectorRegistry,
    DevilNDoveReadConnector,
    YardWorkersReadConnector,
)
from rosevear_ai_hub.config import Settings
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import AuditEvent, ConfirmationRequest


def build_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'business-writes.db'}")
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with session_maker() as session:
            yield session

    application = create_app()
    application.dependency_overrides[get_session] = override_session
    client = TestClient(application)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201
    return client, session_maker


def prepare_and_approve(
    client: TestClient,
    *,
    tool_key: str,
    arguments: dict[str, object],
) -> str:
    prepared = client.post(
        "/api/v1/confirmations",
        json={"tool_key": tool_key, "arguments": arguments},
    )
    assert prepared.status_code == 201
    confirmation_id = prepared.json()["id"]
    approved = client.post(f"/api/v1/confirmations/{confirmation_id}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    return confirmation_id


def test_devilndove_write_requires_exact_approval_and_cannot_replay(
    tmp_path,
    monkeypatch,
) -> None:
    calls: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "ok": True,
                "note": {
                    "product_story_public_note_id": 91,
                    "product_id": 42,
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
    registry = ConnectorRegistry((connector,))
    monkeypatch.setattr(business_api, "_registry", lambda session: registry)

    client, session_maker = build_client(tmp_path)
    arguments = {
        "product_id": 42,
        "heading": "Workshop story",
        "summary": "Review-only summary",
        "body": "Draft body",
    }
    confirmation_id = prepare_and_approve(
        client,
        tool_key="business.devilndove.story_draft.create",
        arguments=arguments,
    )

    executed = client.post(
        "/api/v1/business/connectors/devilndove/write/story_draft",
        json={
            "confirmation_id": confirmation_id,
            "arguments": arguments,
        },
    )
    assert executed.status_code == 200
    payload = executed.json()
    assert payload["result"]["note_id"] == 91
    assert payload["result"]["display_status"] == "draft"
    assert payload["result"]["privacy_status"] == "needs_review"
    assert calls[0]["display_status"] == "draft"
    assert calls[0]["privacy_status"] == "needs_review"

    replay = client.post(
        "/api/v1/business/connectors/devilndove/write/story_draft",
        json={
            "confirmation_id": confirmation_id,
            "arguments": arguments,
        },
    )
    assert replay.status_code == 409
    assert len(calls) == 1

    with session_maker() as session:
        confirmation = session.get(ConfirmationRequest, confirmation_id)
        assert confirmation is not None
        assert confirmation.status == "consumed"
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "business.write.completed")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        assert event.tool_key == "business.devilndove.story_draft.create"
        assert event.confirmation_id == confirmation_id


def test_confirmed_write_rejects_argument_mismatch_before_provider_call(
    tmp_path,
    monkeypatch,
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(500)

    connector = DevilNDoveReadConnector(
        Settings(DEVILNDOVE_BASE_URL="https://devilndove.com"),
        credential="test-admin-credential",
        transport=httpx.MockTransport(handler),
    )
    monkeypatch.setattr(
        business_api,
        "_registry",
        lambda session: ConnectorRegistry((connector,)),
    )

    client, _ = build_client(tmp_path)
    approved_arguments = {
        "product_id": 42,
        "heading": "Approved heading",
        "summary": "Approved summary",
        "body": "",
    }
    confirmation_id = prepare_and_approve(
        client,
        tool_key="business.devilndove.story_draft.create",
        arguments=approved_arguments,
    )

    response = client.post(
        "/api/v1/business/connectors/devilndove/write/story_draft",
        json={
            "confirmation_id": confirmation_id,
            "arguments": {
                **approved_arguments,
                "heading": "Different heading",
            },
        },
    )
    assert response.status_code == 409
    assert calls == 0


def test_yardworkers_confirmed_write_forces_private_internal_comment(
    tmp_path,
    monkeypatch,
) -> None:
    calls: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append(body)
        assert request.url.path == "/functions/v1/jobs-manage"
        return httpx.Response(
            200,
            json={
                "ok": True,
                "record": {
                    "id": "comment-88",
                    "job_id": 88,
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
    monkeypatch.setattr(
        business_api,
        "_registry",
        lambda session: ConnectorRegistry((connector,)),
    )

    client, _ = build_client(tmp_path)
    arguments = {
        "job_id": 88,
        "comment_text": "Crew completed internal closeout check.",
    }
    confirmation_id = prepare_and_approve(
        client,
        tool_key="business.yardworkers.job_comment.create",
        arguments=arguments,
    )
    response = client.post(
        "/api/v1/business/connectors/yardworkers/write/job_comment",
        json={"confirmation_id": confirmation_id, "arguments": arguments},
    )

    assert response.status_code == 200
    assert response.json()["result"]["visible_to_client"] is False
    assert response.json()["result"]["is_special_instruction"] is False
    assert calls == [
        {
            "entity": "job_comment",
            "action": "create",
            "job_id": 88,
            "comment_type": "update",
            "comment_text": "Crew completed internal closeout check.",
            "is_special_instruction": False,
            "visible_to_client": False,
            "set_job_instruction": False,
        }
    ]


def test_provider_failure_consumes_confirmation_and_never_auto_retries(
    tmp_path,
    monkeypatch,
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        raise httpx.ConnectTimeout("provider timeout", request=request)

    connector = DevilNDoveReadConnector(
        Settings(DEVILNDOVE_BASE_URL="https://devilndove.com"),
        credential="test-admin-credential",
        transport=httpx.MockTransport(handler),
    )
    monkeypatch.setattr(
        business_api,
        "_registry",
        lambda session: ConnectorRegistry((connector,)),
    )

    client, session_maker = build_client(tmp_path)
    arguments = {
        "product_id": 42,
        "heading": "Timeout draft",
        "summary": "Provider outcome may be uncertain",
        "body": "",
    }
    confirmation_id = prepare_and_approve(
        client,
        tool_key="business.devilndove.story_draft.create",
        arguments=arguments,
    )
    failed = client.post(
        "/api/v1/business/connectors/devilndove/write/story_draft",
        json={"confirmation_id": confirmation_id, "arguments": arguments},
    )

    assert failed.status_code == 503
    assert "confirmation was consumed" in failed.json()["detail"].lower()
    assert calls == 1

    replay = client.post(
        "/api/v1/business/connectors/devilndove/write/story_draft",
        json={"confirmation_id": confirmation_id, "arguments": arguments},
    )
    assert replay.status_code == 409
    assert calls == 1

    with session_maker() as session:
        confirmation = session.get(ConfirmationRequest, confirmation_id)
        assert confirmation is not None
        assert confirmation.status == "consumed"
        event = session.scalar(
            select(AuditEvent)
            .where(AuditEvent.event_type == "business.write.uncertain")
            .order_by(AuditEvent.id.desc())
        )
        assert event is not None
        assert event.confirmation_id == confirmation_id


def test_rosiedazzlers_has_no_build_040_write_operation(tmp_path) -> None:
    client, _ = build_client(tmp_path)
    response = client.post(
        "/api/v1/business/connectors/rosiedazzlers/write/job_comment",
        json={
            "confirmation_id": "not-used",
            "arguments": {"job_id": 1, "comment_text": "No write"},
        },
    )
    assert response.status_code == 404
    assert "not approved" in response.json()["detail"].lower()
