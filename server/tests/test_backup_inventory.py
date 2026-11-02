"""Build 224: backup observation never reads protected file contents or grants access."""

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub.api.backup_inventory import collect_backup_inventory
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base


def test_backup_inventory_only_lists_expected_names_and_never_claims_verified(tmp_path: Path):
    home = tmp_path / "logs" / "private-recovery"
    home.mkdir(parents=True)
    (home / "hub-20261102.hubbackup").write_bytes(b"encrypted-sample-not-verified")
    (home / "hub-20261102-verified.json").write_text('{"status":"pass","secret":"do not read"}')
    (home / "backup-key.dpapi").write_bytes(b"private-key")
    report = collect_backup_inventory(tmp_path)
    assert report["directory_state"] == "present"
    assert report["archive_count"] == 1
    assert report["evidence_file_count"] == 1
    assert report["archive_integrity"] == "not_checked"
    assert report["last_verified_restore"] is None
    assert report["off_machine_copy"] == "not_verified"
    assert "private-key" not in str(report)
    assert "do not read" not in str(report)
    assert "hub-20261102" not in str(report)


def test_missing_and_linked_recovery_directories_are_not_treated_as_empty(tmp_path: Path):
    assert collect_backup_inventory(tmp_path)["archive_count"] is None
    (tmp_path / "logs").mkdir()
    external = tmp_path / "external"
    external.mkdir()
    (tmp_path / "logs" / "private-recovery").symlink_to(external, target_is_directory=True)
    report = collect_backup_inventory(tmp_path)
    assert report["directory_state"] == "unsafe_symlink"
    assert report["archive_count"] is None


def test_backup_inventory_endpoint_is_owner_only(tmp_path: Path, monkeypatch):
    engine = build_engine(f"sqlite:///{tmp_path / 'backup-inventory.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override_session():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_session
    monkeypatch.setattr(
        "rosevear_ai_hub.api.backup_inventory.collect_backup_inventory",
        lambda root: {
            "directory_state": "not_found",
            "archive_count": None,
        },
    )
    client = TestClient(app)
    address = "/api/v1/system/backup-inventory"
    assert client.get(address).status_code == 401
    assert (
        client.post(
            "/api/v1/auth/bootstrap",
            json={
                "username": "owner",
                "password": "backup-owner-secret-123",
            },
        ).status_code
        == 201
    )
    assert client.get(address).status_code == 200
    assert client.get(address).headers["cache-control"] == "no-store"
    assert (
        client.post(
            "/api/v1/auth/users",
            json={
                "username": "family",
                "password": "backup-family-secret-123",
                "role": "read_only",
            },
        ).status_code
        == 201
    )
    client.post("/api/v1/auth/logout")
    assert (
        client.post(
            "/api/v1/auth/login",
            json={
                "username": "family",
                "password": "backup-family-secret-123",
            },
        ).status_code
        == 200
    )
    assert client.get(address).status_code == 403
