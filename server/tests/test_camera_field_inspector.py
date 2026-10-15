"""Build 076 local read-only SQLite migration field inspection acceptance."""

import importlib.util
from pathlib import Path

from sqlalchemy import create_engine, text

from rosevear_ai_hub.database import Base


def load_inspector():
    script = Path(__file__).resolve().parents[2] / "scripts/hub_camera_import_field_check.py"
    spec = importlib.util.spec_from_file_location("camera_field_inspector", script)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_field_inspector_reads_without_writing(tmp_path) -> None:
    database = tmp_path / "hub.db"
    engine = create_engine(f"sqlite:///{database}")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0021')"))
    checker = load_inspector()
    before = database.stat().st_mtime_ns
    output = checker.inspect_database(database)
    assert output["status"] == "GREEN"
    assert output["sqlite_quick_check"] is True
    assert output["windows_runtime_services_verified"] is False
    assert database.stat().st_mtime_ns == before
    engine.dispose()


def test_inspector_holds_for_old_schema(tmp_path) -> None:
    database = tmp_path / "old.db"
    engine = create_engine(f"sqlite:///{database}")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0020')"))
    result = load_inspector().inspect_database(database)
    assert result["status"] == "HOLD"
    engine.dispose()
