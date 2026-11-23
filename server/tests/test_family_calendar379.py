"""Build379: family calendar RBAC, privacy, DST, recurring chores and receipts."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import FamilyPlan379, FamilyPlanEvent379

BASE = "/api/v1/family-calendar-379"
PASSWORD = "family-calendar-password-123"


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'family379.db'}")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    app = create_app()

    def override():
        with factory() as db:
            yield db

    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/bootstrap",
        json={"username": "owner", "password": PASSWORD},
    )
    assert response.status_code == 201, response.text
    people = {"owner": response.json()["id"]}
    for name, role in (
        ("alice", "household_user"),
        ("bob", "household_user"),
        ("reader", "read_only"),
    ):
        response = client.post(
            "/api/v1/auth/users",
            json={"username": name, "role": role, "password": PASSWORD},
        )
        assert response.status_code == 201, response.text
        people[name] = response.json()["id"]
    return client, factory, people


def login(client, username):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": PASSWORD},
    )
    assert response.status_code == 200, response.text


def date_at(hours=2):
    future = datetime.now(UTC) + timedelta(hours=hours)
    return future.strftime("%Y-%m-%dT%H:%M")


def plan(**values):
    return {
        "title": "Test household chore",
        "kind": "chore",
        "detail": "Test task only",
        "supplies": "none",
        "visibility": "household",
        "local_due": date_at(),
        "timezone": "UTC",
        "recurrence_days": 7,
        "reminder_minutes": 60,
        "assignee_user_id": None,
        **values,
    }


def test_create_household_chores_timezone_and_read_only_access(tmp_path):
    client, factory, ids = setup(tmp_path)
    login(client, "alice")
    response = client.post(BASE + "/plans", json=plan(assignee_user_id=ids["alice"]))
    assert response.status_code == 201, response.text
    item = response.json()
    assert item["status"] == "open"
    assert item["revision"] == 1
    assert item["reminderDue"] is False
    assert item["automaticMessagesSent"] == 0
    board = client.get(BASE + "/board")
    assert board.status_code == 200
    assert board.headers["Cache-Control"] == "no-store"
    assert board.json()["backgroundSchedulerEnabled"] is False
    assert board.json()["outboundNotificationsEnabled"] is False
    assert board.json()["externalCalendarSyncEnabled"] is False
    assert board.json()["automaticDeviceActionsEnabled"] is False
    assert (
        client.post(
            BASE + "/plans",
            json=plan(assignee_user_id=ids["bob"]),
        ).status_code
        == 403
    )
    login(client, "reader")
    assert len(client.get(BASE + "/board").json()["items"]) == 1
    assert client.post(BASE + "/plans", json=plan()).status_code == 403
    assert (
        client.post(
            BASE + f"/plans/{item['id']}/complete", json={"expected_revision": 1}
        ).status_code
        == 403
    )
    assert client.get(BASE + "/members").json()["members"] == []
    with factory() as db:
        assert db.query(FamilyPlan379).count() == 1
        assert db.query(FamilyPlanEvent379).count() == 1


def test_private_visibility_and_nonparticipant_no_history_leak(tmp_path):
    client, _, ids = setup(tmp_path)
    login(client, "alice")
    secret = client.post(
        BASE + "/plans",
        json=plan(
            title="Sensitive appointment",
            kind="appointment",
            visibility="private",
            assignee_user_id=ids["alice"],
        ),
    ).json()
    shared = client.post(BASE + "/plans", json=plan(title="Shared pickup task")).json()
    login(client, "bob")
    board = client.get(BASE + "/board").json()
    assert [x["title"] for x in board["items"]] == ["Shared pickup task"]
    assert all(e["planId"] != secret["id"] for e in board["history"])
    assert (
        client.put(
            BASE + f"/plans/{secret['id']}",
            json={**plan(title="Try to alter"), "expected_revision": 1},
        ).status_code
        == 404
    )
    assert (
        client.post(BASE + f"/plans/{secret['id']}/ack", json={"expected_revision": 1}).status_code
        == 404
    )
    assert (
        client.post(
            BASE + f"/plans/{shared['id']}/complete", json={"expected_revision": 1}
        ).status_code
        == 403
    )
    login(client, "owner")
    assert [x["id"] for x in client.get(BASE + "/board").json()["items"]] == [shared["id"]]
    assert (
        client.post(
            BASE + f"/plans/{secret['id']}/archive", json={"expected_revision": 1}
        ).status_code
        == 404
    )


def test_due_reminder_ack_replay_and_missed_negative_checks(tmp_path):
    client, factory, ids = setup(tmp_path)
    login(client, "owner")
    past = (datetime.now(UTC) - timedelta(hours=3)).strftime("%Y-%m-%dT%H:%M")
    response = client.post(
        BASE + "/plans",
        json=plan(
            local_due=past,
            kind="appointment",
            recurrence_days=None,
            assignee_user_id=ids["alice"],
            reminder_minutes=30,
        ),
    )
    assert response.status_code == 201, response.text
    item = response.json()
    assert item["missed"] is True
    assert item["reminderDue"] is True
    assert item["reminderAcknowledged"] is False
    login(client, "bob")
    assert (
        client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 1}).status_code
        == 403
    )
    login(client, "alice")
    ack = client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 1})
    assert ack.status_code == 200, ack.text
    assert ack.json()["reminderAcknowledged"] is True
    assert ack.json()["revision"] == 2
    assert (
        client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 1}).status_code
        == 409
    )
    assert (
        client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 2}).status_code
        == 409
    )
    done = client.post(BASE + f"/plans/{item['id']}/complete", json={"expected_revision": 2})
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "done"
    assert done.json()["missed"] is False
    assert (
        client.post(
            BASE + f"/plans/{item['id']}/complete", json={"expected_revision": 3}
        ).status_code
        == 409
    )
    assert client.get(BASE + "/board").json()["summary"]["missed"] == 0
    with factory() as db:
        assert db.query(FamilyPlanEvent379).count() == 3


def test_recurrence_uses_local_wall_clock_not_utc_offset(tmp_path):
    client, factory, ids = setup(tmp_path)
    login(client, "owner")
    response = client.post(
        BASE + "/plans",
        json=plan(
            local_due="2027-03-07T14:30",
            timezone="America/Toronto",
            recurrence_days=7,
            assignee_user_id=ids["alice"],
            reminder_minutes=0,
        ),
    )
    assert response.status_code == 201, response.text
    item = response.json()
    due = item["dueAtUtc"]
    login(client, "alice")
    next_ = client.post(BASE + f"/plans/{item['id']}/complete", json={"expected_revision": 1})
    assert next_.status_code == 200, next_.text
    next_item = next_.json()
    assert next_item["status"] == "open"
    assert next_item["localDue"] == "2027-03-14T14:30"
    assert next_item["completionCount"] == 1
    assert next_item["reminderAcknowledged"] is False
    assert next_item["dueAtUtc"] != due
    assert (
        datetime.fromisoformat(next_item["dueAtUtc"]) - datetime.fromisoformat(due)
    ) == timedelta(days=7, hours=-1)
    assert (
        client.post(
            BASE + f"/plans/{item['id']}/complete", json={"expected_revision": 1}
        ).status_code
        == 409
    )
    with factory() as db:
        assert db.query(FamilyPlanEvent379).count() == 2


@pytest.mark.parametrize(
    "local_due",
    ["2027-03-14T02:30", "2027-11-07T01:30", "2027-03-02T25:00", ""],
)
def test_invalid_dst_gap_fold_and_time_format_rejected(tmp_path, local_due):
    client, _, _ = setup(tmp_path)
    response = client.post(
        BASE + "/plans",
        json=plan(local_due=local_due, timezone="America/Toronto"),
    )
    assert response.status_code == 422, response.text


def test_update_invalidates_ack_archive_and_access_control(tmp_path):
    client, factory, ids = setup(tmp_path)
    past = (datetime.now(UTC) - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")
    login(client, "alice")
    item = client.post(
        BASE + "/plans",
        json=plan(
            local_due=past,
            reminder_minutes=0,
            assignee_user_id=ids["alice"],
        ),
    ).json()
    assert (
        client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 1}).status_code
        == 200
    )
    changed = client.put(
        BASE + f"/plans/{item['id']}",
        json={**plan(local_due=date_at(4)), "expected_revision": 2},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["reminderAcknowledged"] is False
    assert changed.json()["reminderDue"] is False
    assert (
        client.post(BASE + f"/plans/{item['id']}/ack", json={"expected_revision": 3}).status_code
        == 409
    )
    login(client, "bob")
    assert (
        client.post(
            BASE + f"/plans/{item['id']}/archive", json={"expected_revision": 3}
        ).status_code
        == 403
    )
    login(client, "alice")
    archived = client.post(BASE + f"/plans/{item['id']}/archive", json={"expected_revision": 3})
    assert archived.status_code == 200, archived.text
    assert client.get(BASE + "/board").json()["items"] == []
    with factory() as db:
        row = db.get(FamilyPlan379, item["id"])
        assert row is not None and row.status == "archived"
        assert db.query(FamilyPlanEvent379).count() == 4
