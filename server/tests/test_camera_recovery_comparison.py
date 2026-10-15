"""Build 077: isolated recovery comparison never overwrites the live database."""

import importlib.util
import shutil
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

from rosevear_ai_hub.database import Base


def load_recovery_check(monkeypatch):
    directory = Path(__file__).resolve().parents[2] / "scripts"
    monkeypatch.syspath_prepend(str(directory))
    path = directory / "hub_camera_recovery_verify.py"
    spec = importlib.util.spec_from_file_location("camera_recovery_check", path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_compare_recovery_read_only_and_fail_closed(tmp_path, monkeypatch) -> None:
    current = tmp_path / "current.db"
    recovered = tmp_path / "recovered.db"
    engine = create_engine(f"sqlite:///{current}")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0022')"))
    engine.dispose()
    shutil.copyfile(current, recovered)
    check = load_recovery_check(monkeypatch)
    before = (current.stat().st_mtime_ns, recovered.stat().st_mtime_ns)
    matched = check.compare_recovery(current, recovered)
    assert matched["status"] == "EVIDENCE_MATCH"
    assert not matched["restore_performed"]
    assert matched["manual_service_acceptance_required"]
    assert before == (current.stat().st_mtime_ns, recovered.stat().st_mtime_ns)

    engine = create_engine(f"sqlite:///{current}")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO camera_compatibility_records "
                "(brand, model, location, method, evidence, revision) "
                "VALUES ('Blink', 'Indoor', 'Den', 'unverified', '', 1)"
            )
        )
    engine.dispose()
    assert check.compare_recovery(current, recovered)["status"] == "HOLD"
    with pytest.raises(ValueError):
        check.compare_recovery(current, current)

def test_same_counts_but_changed_camera_values_is_hold(tmp_path, monkeypatch) -> None:
    current = tmp_path / "same-count-current.db"
    recovered = tmp_path / "same-count-recovered.db"
    engine = create_engine(f"sqlite:///{current}")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0022')"))
        connection.execute(
            text(
                "INSERT INTO camera_compatibility_records "
                "(brand, model, location, method, evidence, revision) "
                "VALUES ('Blink', 'Indoor', 'Den', 'unverified', '', 1)"
            )
        )
    engine.dispose()
    shutil.copyfile(current, recovered)
    check = load_recovery_check(monkeypatch)
    assert check.compare_recovery(current, recovered)["status"] == "EVIDENCE_MATCH"
    other = create_engine(f"sqlite:///{recovered}")
    with other.begin() as connection:
        connection.execute(
            text("UPDATE camera_compatibility_records SET model = 'Modified' WHERE brand = 'Blink'")
        )
    other.dispose()
    result = check.compare_recovery(current, recovered)
    assert result["status"] == "HOLD"
    assert result["same_camera_counts"]
    assert not result["same_camera_and_acceptance_content"]


def test_recovery_requires_different_files_not_hard_links(tmp_path, monkeypatch) -> None:
    current = tmp_path / "current.db"
    alias = tmp_path / "alias.db"
    engine = create_engine(f"sqlite:///{current}")
    Base.metadata.create_all(engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32))"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('0022')"))
    engine.dispose()
    try:
        alias.hardlink_to(current)
    except OSError:
        pytest.skip("Filesystem does not permit hard links")
    check = load_recovery_check(monkeypatch)
    with pytest.raises(ValueError):
        check.compare_recovery(current, alias)
