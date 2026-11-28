"""Build 394 uses only temporary SQLite databases, never the live host."""

import importlib.util
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

SCRIPT = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(SCRIPT))
spec = importlib.util.spec_from_file_location(
    "hub_schema_recovery394", SCRIPT / "hub_schema_recovery394.py"
)
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)
sys.path.remove(str(SCRIPT))


def upgrade(path, version, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///" + path.as_posix())
    command.upgrade(Config("alembic.ini"), version)


def test_real_0029_to_0040_rehearsal_preserves_old_records(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    scratch = tmp_path / "rehearsal.sqlite3"
    upgrade(source, "0029", monkeypatch)
    with closing(sqlite3.connect(source)) as db:
        db.execute("CREATE TABLE preserved_fixture (id INTEGER PRIMARY KEY, text_value TEXT)")
        db.execute("INSERT INTO preserved_fixture VALUES (1, 'private fixture')")
        db.commit()
    report = recovery.rehearse(source, scratch, lambda path: upgrade(path, "0040", monkeypatch))
    assert report["sourceRevision"] == "0029"
    assert report["rehearsedRevision"] == "0040"
    assert report["existingRowsPreserved"] is True
    assert report["newTables"] > 0
    assert report["liveMigrationPerformed"] is False
    with closing(recovery.readonly(source)) as db:
        assert recovery.revision(db) == "0029"
        assert db.execute("SELECT * FROM preserved_fixture").fetchall() == [(1, "private fixture")]
    with pytest.raises(ValueError, match="NEW_ISOLATED"):
        recovery.rehearse(source, source, lambda path: None)
    with pytest.raises(ValueError, match="NEW_ISOLATED"):
        recovery.rehearse(source, scratch, lambda path: None)


def test_migration_that_changes_existing_records_is_held(tmp_path, monkeypatch):
    source = tmp_path / "source.sqlite3"
    upgrade(source, "0029", monkeypatch)
    with closing(sqlite3.connect(source)) as db:
        db.execute("CREATE TABLE preserved_fixture (value TEXT)")
        db.execute("INSERT INTO preserved_fixture VALUES ('original')")
        db.commit()

    def corrupt(path):
        upgrade(path, "0040", monkeypatch)
        with closing(sqlite3.connect(path)) as db:
            db.execute("UPDATE preserved_fixture SET value='changed'")
            db.commit()

    with pytest.raises(ValueError, match="EXISTING_RECORDS_CHANGED"):
        recovery.rehearse(source, tmp_path / "scratch.sqlite3", corrupt)


def test_interrupted_activation_is_never_approved(tmp_path):
    manager = recovery.releases.Manager(tmp_path)
    assert recovery.journal_state(manager) == "LEGACY"
    recovery.releases.atomic_json(manager.journal, {"phase": "activating", "previous": "a" * 40})
    assert recovery.journal_state(manager) == "INTERRUPTED_ACTIVATION_HOLD"
    recovery.releases.atomic_json(manager.journal, {"phase": "supervised_bootstrap"})
    assert recovery.journal_state(manager) == "SUPERVISED_BOOTSTRAP"
    recovery.releases.atomic_json(manager.journal, {"phase": "committed"})
    assert recovery.journal_state(manager) == "UNKNOWN_HOLD"
