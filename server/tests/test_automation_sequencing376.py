"""Build 376 governance: deterministic graph, approvals, replay and outage holds."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.automation_sequencing376 import Step, calculate_order
from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Automation


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'seq376.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def override():
        with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": "owner-password-123"},
    )
    assert response.status_code == 201, response.text
    rule = {
        "schema_version": 1,
        "trigger": {"type": "state_change", "entity_id": "sensor.entry", "to_state": "on"},
        "conditions": [],
        "actions": [
            {
                "type": "tool",
                "tool_key": "notification.household.send",
                "arguments": {"title": "Synthetic", "message": "No device action"},
            }
        ],
        "cooldown_seconds": 0,
        "deduplication_key": "synthetic-read-only",
    }
    with factory() as db:
        for name in ("First", "Second", "Third"):
            db.add(Automation(name=name, enabled=True, definition_json=rule))
        db.commit()
        ids = [x.id for x in db.query(Automation).order_by(Automation.id).all()]
    return client, factory, ids


def graph(ids):
    return {
        "title": "Private causal dependency rehearsal",
        "steps": [
            {"automation_id": ids[2], "depends_on": [ids[1]]},
            {"automation_id": ids[0], "depends_on": []},
            {"automation_id": ids[1], "depends_on": [ids[0]]},
        ],
        "cooldown_seconds": 180,
        "expected_revision": 0,
    }


def test_dag_cycle_and_unknown_dependency():
    assert calculate_order(
        [
            Step(automation_id=3, depends_on=[2]),
            Step(automation_id=1, depends_on=[]),
            Step(automation_id=2, depends_on=[1]),
        ]
    ) == [1, 2, 3]
    import pytest

    with pytest.raises(ValueError, match="cycle"):
        calculate_order(
            [
                Step(automation_id=1, depends_on=[2]),
                Step(automation_id=2, depends_on=[1]),
            ]
        )
    with pytest.raises(ValueError, match="other steps"):
        calculate_order([Step(automation_id=1, depends_on=[99])])


def test_exact_owner_approval_replay_and_cooldown(tmp_path):
    client, _, ids = setup(tmp_path)
    prefix = "/api/v1/automation-sequencing-376"
    created = client.post(prefix + "/plans", json=graph(ids))
    assert created.status_code == 201, created.text
    plan = created.json()
    assert plan["approvedHash"] is None
    assert plan["executionEnabled"] is False
    route = f"{prefix}/plans/{plan['id']}"
    preview = client.get(route + "/preview")
    assert preview.status_code == 200, preview.text
    p = preview.json()
    assert p["order"] == ids
    assert p["blockers"] == ["HOLD_OWNER_APPROVAL_REQUIRED"]
    assert p["physicalActionsAllowed"] is False
    assert p["externalAppMessagesAreRuntimeObservationsNotGitCommits"] is True

    approval = {
        "expected_revision": plan["revision"],
        "expected_source_hash": p["sourceHash"],
        "owner_confirmed": True,
    }
    assert (
        client.put(route + "/approve", json={**approval, "owner_confirmed": False}).status_code
        == 422
    )
    ok = client.put(route + "/approve", json=approval)
    assert ok.status_code == 200, ok.text
    assert ok.json()["revision"] == 2
    assert ok.json()["executionEnabled"] is False

    baseline = {
        "cause_id": "event-one",
        "expected_revision": 2,
        "unavailable_sources": [],
    }
    a = client.post(route + "/simulate", json=baseline)
    assert a.status_code == 200, a.text
    assert a.json()["state"] == "SIMULATED_ONLY"
    assert a.json()["deviceActions"] == 0
    replay = client.post(route + "/simulate", json=baseline)
    assert replay.status_code == 200
    assert replay.json()["state"] == "REPLAY_HELD"
    cooldown = client.post(
        route + "/simulate",
        json={
            **baseline,
            "cause_id": "event-two",
        },
    )
    assert cooldown.json()["state"] == "HELD"
    assert "HOLD_COOLDOWN" in cooldown.json()["reasonCodes"]
    assert client.get(prefix + "/plans").json()["executorConnected"] is False


def test_provider_outage_and_source_change_hold_without_actuation(tmp_path):
    client, factory, ids = setup(tmp_path)
    prefix = "/api/v1/automation-sequencing-376"
    plan = client.post(prefix + "/plans", json=graph(ids)).json()
    route = f"{prefix}/plans/{plan['id']}"
    pre = client.get(route + "/preview").json()
    assert (
        client.put(
            route + "/approve",
            json={
                "expected_revision": 1,
                "expected_source_hash": pre["sourceHash"],
                "owner_confirmed": True,
            },
        ).status_code
        == 200
    )
    failed = client.post(
        route + "/simulate",
        json={
            "cause_id": "provider-outage",
            "expected_revision": 2,
            "unavailable_sources": ["mqtt", "external_app"],
        },
    )
    assert failed.status_code == 200
    assert failed.json()["state"] == "HELD"
    assert "HOLD_SIMULATED_PROVIDER_UNAVAILABLE" in failed.json()["reasonCodes"]
    assert failed.json()["providerWrites"] == 0
    with factory() as db:
        changed = db.get(Automation, ids[1])
        changed.enabled = False
        db.commit()
    stale = client.get(route + "/preview").json()
    assert "HOLD_SOURCE_RULE_REVISION_CHANGED" in stale["blockers"]
    assert "HOLD_DISABLED_RULE" in stale["blockers"]
    assert (
        client.put(
            route + "/approve",
            json={
                "expected_revision": 2,
                "expected_source_hash": pre["sourceHash"],
                "owner_confirmed": True,
            },
        ).status_code
        == 409
    )
    result = client.post(
        route + "/simulate",
        json={
            "cause_id": "after-source-change",
            "expected_revision": 2,
            "unavailable_sources": [],
        },
    )
    assert result.json()["state"] == "HELD"
    assert result.json()["order"] == []


def test_unsafe_tools_are_not_approved_and_auth_is_owner_only(tmp_path):
    client, factory, ids = setup(tmp_path)
    with factory() as db:
        rule = dict(db.get(Automation, ids[0]).definition_json)
        rule["actions"] = [
            {
                "type": "tool",
                "tool_key": "home_assistant.switch.set",
                "arguments": {"entity_id": "switch.kiln", "state": "on"},
            }
        ]
        db.get(Automation, ids[0]).definition_json = rule
        db.commit()
    prefix = "/api/v1/automation-sequencing-376"
    plan = client.post(prefix + "/plans", json=graph(ids))
    assert plan.status_code == 201
    route = f"{prefix}/plans/{plan.json()['id']}"
    preview = client.get(route + "/preview").json()
    assert "HOLD_POTENTIAL_MACHINE_SWITCH" in preview["blockers"]
    assert (
        client.put(
            route + "/approve",
            json={
                "expected_revision": 1,
                "expected_source_hash": preview["sourceHash"],
                "owner_confirmed": True,
            },
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "viewer",
                "password": "viewer-password-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "viewer",
                "password": "viewer-password-123",
            },
        ).status_code
        == 200
    )
    assert client.get(prefix + "/plans").status_code == 403
    assert client.get(route + "/preview").status_code == 403
    assert client.post(prefix + "/plans", json=graph(ids)).status_code == 403
    assert (
        client.post(
            route + "/simulate",
            json={
                "cause_id": "viewer",
                "expected_revision": 1,
            },
        ).status_code
        == 403
    )
