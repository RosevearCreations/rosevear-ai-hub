"""Build 378 — household RBAC, draft approval, merge, expiry and pickup regression."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import GroceryEvent378, GroceryItem378

PREFIX = "/api/v1/groceries-378"
PASSWORD = "household-test-password-123"


def setup(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'grocery378.db'}")
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
    for name, role in (
        ("family", "household_user"),
        ("auditor", "read_only"),
    ):
        response = client.post(
            "/api/v1/auth/users",
            json={"username": name, "password": PASSWORD, "role": role},
        )
        assert response.status_code == 201, response.text
    return client, factory


def login(client, username):
    response = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": PASSWORD},
    )
    assert response.status_code == 200, response.text


def new_item(name="Milk", **changes):
    return {
        "name": name,
        "unit": "L",
        "wanted_qty": 2.5,
        "on_hand_qty": 1,
        "min_on_hand_qty": 2,
        "recurrence_days": 7,
        "expires_on": (datetime.now(UTC).date() + timedelta(days=3)).isoformat(),
        "pickup_on": (datetime.now(UTC).date() + timedelta(days=1)).isoformat(),
        "price_note": "about 5 CAD, manually noted",
        "note": "family pickup",
        **changes,
    }


def test_family_editor_owner_approval_and_actual_pickup(tmp_path):
    client, factory = setup(tmp_path)
    login(client, "family")
    response = client.post(PREFIX + "/items", json=new_item())
    assert response.status_code == 201, response.text
    item = response.json()
    assert item["state"] == "draft"
    assert item["lowStock"] is True
    assert item["expiresSoon"] is True
    assert item["wantedQty"] == 2.5

    board = client.get(PREFIX + "/board")
    assert board.status_code == 200
    assert board.headers["Cache-Control"] == "no-store"
    assert board.json()["orderingEnabled"] is False
    assert board.json()["paymentsEnabled"] is False
    assert board.json()["externalMessagesEnabled"] is False
    assert (
        client.post(
            PREFIX + f"/items/{item['id']}/approve",
            json={"expected_revision": 1, "owner_confirmed": True},
        ).status_code
        == 403
    )

    login(client, "owner")
    pending = client.post(
        PREFIX + f"/items/{item['id']}/approve",
        json={"expected_revision": 1, "owner_confirmed": False},
    )
    assert pending.status_code == 422
    approved = client.post(
        PREFIX + f"/items/{item['id']}/approve",
        json={"expected_revision": 1, "owner_confirmed": True},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["pickupReady"] is True
    assert approved.json()["revision"] == 2

    login(client, "family")
    receipt_path = PREFIX + f"/items/{item['id']}/receive"
    too_much = client.post(
        receipt_path,
        json={"expected_revision": 2, "owner_confirmed": True, "received_qty": 3},
    )
    assert too_much.status_code == 409
    partial = client.post(
        receipt_path,
        json={"expected_revision": 2, "owner_confirmed": True, "received_qty": 1.5},
    )
    assert partial.status_code == 200, partial.text
    assert partial.json()["onHandQty"] == 2.5
    assert partial.json()["wantedQty"] == 1
    assert partial.json()["state"] == "draft"
    assert partial.json()["approvedAt"] is None
    assert (
        client.post(
            receipt_path,
            json={"expected_revision": 2, "owner_confirmed": True, "received_qty": 1},
        ).status_code
        == 409
    )

    login(client, "owner")
    assert (
        client.post(
            PREFIX + f"/items/{item['id']}/approve",
            json={"expected_revision": 3, "owner_confirmed": True},
        ).status_code
        == 200
    )
    login(client, "family")
    complete = client.post(
        receipt_path,
        json={"expected_revision": 4, "owner_confirmed": True, "received_qty": 1},
    )
    assert complete.status_code == 200, complete.text
    assert complete.json()["state"] == "picked_up"
    assert complete.json()["onHandQty"] == 3.5
    assert complete.json()["wantedQty"] == 0
    with factory() as db:
        assert len(db.query(GroceryEvent378).all()) == 5
        assert db.query(GroceryItem378).count() == 1


def test_edit_invalidates_approval_and_exact_merge_is_audited(tmp_path):
    client, factory = setup(tmp_path)
    a = client.post(PREFIX + "/items", json=new_item(" Apples  ", unit="kg"))
    b = client.post(
        PREFIX + "/items",
        json=new_item("apples", unit="kg", on_hand_qty=3, wanted_qty=1),
    )
    assert a.status_code == 201, a.text
    assert b.status_code == 201, b.text
    first, duplicate = a.json(), b.json()
    board = client.get(PREFIX + "/board").json()
    assert board["duplicateGroups"] == [[first["id"], duplicate["id"]]]
    approved = client.post(
        PREFIX + f"/items/{first['id']}/approve",
        json={"expected_revision": 1, "owner_confirmed": True},
    )
    assert approved.status_code == 200

    mismatch = client.post(
        PREFIX + "/merge",
        json={
            "target_id": first["id"],
            "duplicate_id": duplicate["id"],
            "target_revision": 1,
            "duplicate_revision": 1,
            "owner_confirmed": True,
        },
    )
    assert mismatch.status_code == 409

    merged = client.post(
        PREFIX + "/merge",
        json={
            "target_id": first["id"],
            "duplicate_id": duplicate["id"],
            "target_revision": 2,
            "duplicate_revision": 1,
            "owner_confirmed": True,
        },
    )
    assert merged.status_code == 200, merged.text
    target = merged.json()["target"]
    assert target["onHandQty"] == 4
    assert target["wantedQty"] == 3.5
    assert target["state"] == "draft"
    assert target["approvedByUserId"] is None
    assert len(client.get(PREFIX + "/board").json()["items"]) == 1
    with factory() as db:
        archived = db.get(GroceryItem378, duplicate["id"])
        assert archived is not None
        assert archived.state == "archived"
        assert db.query(GroceryEvent378).count() == 5

    changed = client.patch(
        PREFIX + f"/items/{first['id']}",
        json={"expected_revision": 3, "wanted_qty": 5},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["revision"] == 4
    assert (
        client.patch(
            PREFIX + f"/items/{first['id']}",
            json={"expected_revision": 3, "wanted_qty": 4},
        ).status_code
        == 409
    )


def test_role_isolation_archive_and_no_hidden_payment(tmp_path):
    client, factory = setup(tmp_path)
    item = client.post(PREFIX + "/items", json=new_item()).json()
    login(client, "auditor")
    assert client.get(PREFIX + "/board").status_code == 200
    assert client.post(PREFIX + "/items", json=new_item("rice")).status_code == 403
    assert (
        client.patch(
            PREFIX + f"/items/{item['id']}", json={"expected_revision": 1, "note": "x"}
        ).status_code
        == 403
    )
    assert (
        client.post(
            PREFIX + f"/items/{item['id']}/archive",
            json={"expected_revision": 1, "owner_confirmed": True},
        ).status_code
        == 403
    )
    login(client, "family")
    assert (
        client.post(
            PREFIX + f"/items/{item['id']}/archive",
            json={"expected_revision": 1, "owner_confirmed": True},
        ).status_code
        == 403
    )
    login(client, "owner")
    archived = client.post(
        PREFIX + f"/items/{item['id']}/archive",
        json={"expected_revision": 1, "owner_confirmed": True},
    )
    assert archived.status_code == 200
    assert client.get(PREFIX + "/board").json()["items"] == []
    assert (
        client.patch(
            PREFIX + f"/items/{item['id']}", json={"expected_revision": 2, "note": "restore"}
        ).status_code
        == 404
    )
    with factory() as db:
        assert db.get(GroceryItem378, item["id"]) is not None


def test_input_validation_no_automatic_reordering_and_recurring_due(tmp_path):
    client, factory = setup(tmp_path)
    invalid = [
        new_item("bad", wanted_qty=-1),
        new_item("bad", unit="GBP"),
        new_item("bad", recurrence_days=0),
        new_item("bad", on_hand_qty="Infinity"),
        new_item("bad", note="bad\nheader"),
        new_item("  "),
    ]
    for data in invalid:
        response = client.post(PREFIX + "/items", json=data)
        assert response.status_code == 422, response.text
    created = client.post(PREFIX + "/items", json=new_item()).json()
    with factory() as db:
        row = db.get(GroceryItem378, created["id"])
        assert row is not None
        row.last_picked_up_on = datetime.now(UTC) - timedelta(days=9)
        db.commit()
    board = client.get(PREFIX + "/board").json()
    assert board["items"][0]["recurrenceDue"] is True
    assert board["items"][0]["state"] == "draft"
    assert board["items"][0]["wantedQty"] == 2.5
    assert board["orderingEnabled"] is False
    assert board["retailerConnected"] is False
