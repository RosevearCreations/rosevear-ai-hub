"""Build 057: project isolation, manual inspection states and authorization."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import WorkshopEquipment, WorkshopInspection


def make_client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'workshop.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={"username": "owner", "password": "owner-password-123"},
        ).status_code
        == 201
    )
    return client, sessions


def create_station(client, key: str, name: str):
    result = client.post(
        "/api/v1/workshop/stations",
        json={
            "project_key": key,
            "name": name,
            "description": "General workstation",
            "hazards_json": ["moving parts", "heat"],
        },
    )
    assert result.status_code == 201, result.text
    return result.json()["id"]


def create_equipment(client, key: str, station_id: int | None):
    return client.post(
        "/api/v1/workshop/equipment",
        json={
            "project_key": key,
            "station_id": station_id,
            "name": "Workshop tool",
            "equipment_type": "Bench item",
            "activity_type": "laser",
            "notes": "Check guards manually",
        },
    )


def test_project_boundaries_and_no_automatic_safety_approval(tmp_path):
    client, sessions = make_client(tmp_path)
    first = create_station(client, "project_one", "Assembly")
    second = create_station(client, "project_two", "Assembly")
    assert first != second
    assert (
        client.post(
            "/api/v1/workshop/stations",
            json={"project_key": "project_one", "name": "Assembly"},
        ).status_code
        == 409
    )
    denied = create_equipment(client, "project_one", second)
    assert denied.status_code == 422
    assert client.get("/api/v1/workshop/equipment").json() == []

    response = create_equipment(client, "project_one", first)
    assert response.status_code == 201, response.text
    item_id = response.json()["id"]
    assert response.json()["readiness_status"] == "unverified"
    assert client.get("/api/v1/workshop/readiness").json()["automatic_equipment_control"] is False

    unsafe = client.post(
        f"/api/v1/workshop/equipment/{item_id}/inspections",
        json={"review_status": "unsafe", "note": "Damaged guard"},
    )
    assert unsafe.status_code == 201
    assert client.get("/api/v1/workshop/equipment").json()[0]["readiness_status"] == "blocked"

    observed = client.post(
        f"/api/v1/workshop/equipment/{item_id}/inspections",
        json={"review_status": "observed_ok", "note": "Visual check, separate sign-off needed"},
    )
    assert observed.status_code == 201
    equipment = client.get("/api/v1/workshop/equipment").json()[0]
    assert equipment["readiness_status"] == "review_required"
    assert equipment["activity_type"] == "laser"
    history = client.get(f"/api/v1/workshop/equipment/{item_id}/inspections").json()
    assert len(history) == 2
    assert history[0]["review_status"] == "observed_ok"
    assert history[1]["review_status"] == "unsafe"
    with sessions() as db:
        assert db.query(WorkshopInspection).count() == 2
        assert db.get(WorkshopEquipment, item_id).readiness_status == "review_required"


def test_safety_invalid_inputs_and_read_only_account_denied(tmp_path):
    client, _ = make_client(tmp_path)
    assert (
        client.post(
            "/api/v1/workshop/stations",
            json={"project_key": "../bad", "name": "Forging"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/workshop/stations",
            json={"project_key": "forge", "name": "Heat", "hazards_json": ["x" * 81]},
        ).status_code
        == 422
    )
    station_id = create_station(client, "forge", "Heat")
    item = create_equipment(client, "forge", station_id).json()
    item_id = item["id"]
    assert (
        client.post(
            f"/api/v1/workshop/equipment/{item_id}/inspections",
            json={"review_status": "certified_safe", "note": "No"},
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/api/v1/workshop/equipment/{item_id}",
            json={"readiness_status": "ready"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/auth/users",
            json={"username": "viewer", "password": "reader-password-123", "role": "read_only"},
        ).status_code
        == 201
    )
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "viewer", "password": "reader-password-123"},
        ).status_code
        == 200
    )
    assert client.get("/api/v1/workshop/stations").status_code == 200
    assert client.get("/api/v1/workshop/equipment").status_code == 200
    assert (
        client.post(
            f"/api/v1/workshop/equipment/{item_id}/inspections",
            json={"review_status": "unsafe", "note": "Not permitted"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/workshop/stations",
            json={"project_key": "forge", "name": "Unauthorized"},
        ).status_code
        == 403
    )
