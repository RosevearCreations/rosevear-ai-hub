"""Build 218: manual jobs, material unit boundaries, photo privacy and reversible edits."""

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.database import Base, build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import WorkshopJob, WorkshopJobPhoto


def client_and_db(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'jobs218.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with sessions() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    assert (
        client.post(
            "/api/v1/auth/bootstrap", json={"username": "owner", "password": "owner-password-123"}
        ).status_code
        == 201
    )
    return client, sessions


def payload():
    return {
        "title": "Silver pendant",
        "category": "jewelry",
        "equipment_id": None,
        "status": "active",
        "progress_percent": 30,
        "estimated_minutes": 120,
        "actual_minutes": 45,
        "materials": [
            {"name": "Sterling silver", "unit": "g", "estimated": "12.500", "actual": "8.125"}
        ],
        "notes": "Manual workshop bench observation",
        "archived": False,
    }


def test_build_218_material_precision_progress_revision_and_archive(tmp_path):
    client, sessions = client_and_db(tmp_path)
    created = client.post("/api/v1/workshop/jobs", json=payload())
    assert created.status_code == 201, created.text
    job = created.json()
    assert job["revision"] == 1
    assert job["materials"][0]["actual"] == "8.125"
    assert job["inventory_deducted"] is False
    assert job["equipment_control"] is False
    route = f"/api/v1/workshop/jobs/{job['id']}"
    updated = client.put(route, json={**payload(), "expected_revision": 1, "archived": True})
    assert updated.status_code == 200
    assert updated.json()["revision"] == 2
    assert client.get("/api/v1/workshop/jobs").json() == []
    assert len(client.get("/api/v1/workshop/jobs?include_archived=true").json()) == 1
    assert client.put(route, json={**payload(), "expected_revision": 1}).status_code == 409
    assert client.put(route, json={**payload(), "expected_revision": 2}).status_code == 200
    assert len(client.get("/api/v1/workshop/jobs").json()) == 1
    with sessions() as db:
        assert db.query(WorkshopJob).count() == 1


def test_build_218_rejects_invalid_units_progress_and_materials(tmp_path):
    client, _ = client_and_db(tmp_path)
    invalid = [
        {
            **payload(),
            "materials": [{"name": "Silver", "unit": "lb", "estimated": "1", "actual": "0"}],
        },
        {
            **payload(),
            "materials": [{"name": "Silver", "unit": "g", "estimated": "-1", "actual": "0"}],
        },
        {
            **payload(),
            "materials": [{"name": "Silver", "unit": "g", "estimated": "1.1234", "actual": "0"}],
        },
        {
            **payload(),
            "materials": [
                {"name": "Silver", "unit": "g", "estimated": "1", "actual": "0"},
                {"name": "silver", "unit": "kg", "estimated": "1", "actual": "0"},
            ],
        },
        {**payload(), "progress_percent": 101},
        {**payload(), "status": "completed", "progress_percent": 99},
        {**payload(), "equipment_id": 99999},
    ]
    for record in invalid:
        assert client.post("/api/v1/workshop/jobs", json=record).status_code == 422
    assert client.get("/api/v1/workshop/jobs").json() == []


def test_build_218_private_photo_upload_read_and_delete(tmp_path):
    client, sessions = client_and_db(tmp_path)
    job_id = client.post("/api/v1/workshop/jobs", json=payload()).json()["id"]
    route = f"/api/v1/workshop/jobs/{job_id}/photos"
    photo_bytes = b"\x89PNG\r\n\x1a\n" + b"owner evidence"
    added = client.post(route, files={"photo": ("bench.png", photo_bytes, "image/png")})
    assert added.status_code == 201, added.text
    photo_id = added.json()["id"]
    response = client.get(f"{route}/{photo_id}")
    assert response.status_code == 200
    assert response.content == photo_bytes
    assert "no-store" in response.headers["cache-control"]
    assert (
        client.post(route, files={"photo": ("fake.png", b"not image", "image/png")}).status_code
        == 422
    )
    assert (
        client.post(
            route,
            files={"photo": ("large.png", photo_bytes + b"x" * (2 * 1024 * 1024), "image/png")},
        ).status_code
        == 422
    )
    assert client.delete(f"{route}/{photo_id}").status_code == 204
    assert client.get(f"{route}/{photo_id}").status_code == 404
    with sessions() as db:
        assert db.query(WorkshopJobPhoto).count() == 0


def test_build_218_requires_authenticated_and_owner_for_writes(tmp_path):
    client, _ = client_and_db(tmp_path)
    public = TestClient(client.app)
    assert public.get("/api/v1/workshop/jobs").status_code == 401
    assert public.post("/api/v1/workshop/jobs", json=payload()).status_code == 401
    created = client.post("/api/v1/workshop/jobs", json=payload()).json()
    assert public.get(f"/api/v1/workshop/jobs/{created['id']}/photos/1").status_code == 401


def test_build_218_migration_from_0027(tmp_path, monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    database = tmp_path / "upgrade218.db"
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{database}")
    command.upgrade(cfg, "0027")
    command.upgrade(cfg, "head")
    engine = create_engine(f"sqlite:///{database}")
    tables = set(inspect(engine).get_table_names())
    assert {"workshop_jobs", "workshop_job_photos"}.issubset(tables)
