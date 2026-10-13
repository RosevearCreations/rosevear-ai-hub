"""Deployment controller tests: no real network, tasks, process stop or restart."""

import importlib.util
import json
import os
from contextlib import nullcontext
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/hub_release_manager.py"
spec = importlib.util.spec_from_file_location("hub_release_manager", SCRIPT)
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)

A = "a" * 40
B = "b" * 40


def test_exact_push_jobs_and_duplicates():
    run = {
        "head_sha": A,
        "head_branch": "main",
        "event": "push",
        "name": "Foundation, Backend, Web and Desktop Checks",
        "status": "completed",
        "conclusion": "success",
    }
    jobs = [{"name": name, "status": "completed", "conclusion": "success"} for name in manager.JOBS]
    assert manager.eligible(A, run, jobs)
    assert not manager.eligible(B, run, jobs)
    assert not manager.eligible(A, {**run, "event": "pull_request"}, jobs)
    assert not manager.eligible(A, run, jobs + [jobs[0]])
    assert not manager.eligible(A, run, jobs[:-1])
    assert not manager.eligible(A, run, [{**jobs[0], "conclusion": "skipped"}, *jobs[1:]])


def evidence(tmp_path):
    archive = tmp_path / "real.hubbackup"
    archive.write_bytes(b"a fixture, not an actual encrypted backup")
    record = {
        "status": "pass",
        "drill_type": "operator_archive",
        "sqlite_integrity": "ok",
        "sqlite_table_count": 22,
        "restore_to_live_installation": False,
        "scratch_cleanup_verified": True,
        "archive_filename": archive.name,
        "archive_sha256": manager.digest(archive),
        "completed_at_utc": datetime.now(UTC).isoformat(),
    }
    path = tmp_path / "evidence.json"
    path.write_text(json.dumps(record))
    return path, archive, record


@pytest.mark.parametrize(
    "change",
    [
        {"drill_type": "synthetic_only"},
        {"status": "fail"},
        {"scratch_cleanup_verified": False},
        {"restore_to_live_installation": True},
        {"archive_filename": "../elsewhere.hubbackup"},
        {"completed_at_utc": (datetime.now(UTC) - timedelta(days=2)).isoformat()},
        {"completed_at_utc": (datetime.now(UTC) + timedelta(hours=1)).isoformat()},
    ],
)
def test_backup_gate_rejects_unrestorable_stale_or_unsafe_evidence(tmp_path, change):
    path, _, record = evidence(tmp_path)
    path.write_text(json.dumps({**record, **change}))
    with pytest.raises(manager.Refusal):
        manager.verify_backup(path)


def test_backup_gate_pins_exact_archive(tmp_path):
    path, archive, _ = evidence(tmp_path)
    assert manager.verify_backup(path)["status"] == "pass"
    archive.write_bytes(b"modified archive")
    with pytest.raises(manager.Refusal, match="differs"):
        manager.verify_backup(path)


def test_schema_head_is_static_and_no_migration_runs(tmp_path):
    folder = tmp_path / "server/alembic/versions"
    folder.mkdir(parents=True)
    (folder / "one.py").write_text(
        "revision: str = '0016'\ndown_revision = None\nraise RuntimeError('must never execute')\n"
    )
    (folder / "two.py").write_text("revision = '0017'\ndown_revision: str = '0016'\n")
    assert manager.schema_head(tmp_path) == "0017"
    assert manager.schema_changed(["server/alembic/env.py"])
    assert manager.schema_changed(["alembic.ini"])
    assert manager.high_risk_changed(["scripts/hub-auto-update.ps1"])
    assert not manager.high_risk_changed(["apps/web/src/App.tsx"])


def prepared(tmp_path, monkeypatch):
    m = manager.Manager(tmp_path)
    for sha in (A, B):
        path = m.slot(sha)
        path.mkdir(parents=True)
        (path / "release.json").write_text(
            json.dumps({"version": "0.0.57", "schema_revision": "0018"})
        )
    manager.atomic_json(m.state, {"sha": A})
    monkeypatch.setattr(m, "manifest", lambda sha: manager.read_json(m.slot(sha) / "release.json"))
    monkeypatch.setattr(manager, "verify_backup", lambda path: {})
    monkeypatch.setattr(manager, "green_main", lambda: B)
    monkeypatch.setattr(manager, "database_revision", lambda root: "0018")
    monkeypatch.setattr(manager, "git", lambda *args: "apps/web/src/App.tsx")
    monkeypatch.setattr(manager, "inspect_listener", lambda *args: {"pid": 12, "created": "before"})
    return m


def test_schema_mismatch_never_stops_a_process(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(manager, "database_revision", lambda root: "0016")
    monkeypatch.setattr(manager, "stop_verified", lambda *args: pytest.fail("must not stop"))
    with pytest.raises(manager.Refusal, match="schema differs"):
        m.activate(B, A, tmp_path / "evidence")
    assert not m.journal.exists()


def test_control_changes_require_review(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(manager, "git", lambda *args: "scripts/hub-recovery.ps1")
    monkeypatch.setattr(manager, "stop_verified", lambda *args: pytest.fail("must not stop"))
    with pytest.raises(manager.Refusal, match="operator review"):
        m.activate(B, A, tmp_path / "evidence")


def test_failed_activation_restores_previous_source_and_environment(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    calls = []
    monkeypatch.setattr(manager, "stop_verified", lambda port, *args: calls.append(("stop", port)))

    def start(sha):
        calls.append(("start", sha))
        if sha == B:
            raise manager.Refusal("candidate unhealthy")

    monkeypatch.setattr(m, "start", start)
    with pytest.raises(manager.Refusal, match="unhealthy"):
        m.activate(B, A, tmp_path / "evidence")
    assert manager.read_json(m.state)["sha"] == A
    assert manager.read_json(m.journal)["phase"] == "rolled_back"
    assert manager.read_json(m.status)["state"] == "ROLLED_BACK"
    assert ("start", A) in calls


def test_failed_rollback_remains_recoverable_and_never_reports_adopted(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(manager, "stop_verified", lambda *args: None)
    monkeypatch.setattr(m, "start", lambda sha: (_ for _ in ()).throw(manager.Refusal("unhealthy")))
    with pytest.raises(manager.Refusal):
        m.activate(B, A, tmp_path / "evidence")
    assert manager.read_json(m.journal)["phase"] == "activating"
    assert manager.read_json(m.status)["state"] == "ROLLBACK_FAILED"
    assert manager.read_json(m.state)["sha"] == A


def test_crash_recovery_uses_journal_even_if_pointer_changed(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    manager.atomic_json(m.state, {"sha": B})
    manager.atomic_json(m.journal, {"phase": "activating", "previous": A, "candidate": B})
    calls = []
    monkeypatch.setattr(m, "rollback", lambda old, new: calls.append((old, new)))
    m.recover()
    assert calls == [(A, B)]


def test_current_requires_runtime_not_checkout(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(
        manager, "request_json", lambda url: {"service": "Rosevear AI Hub", "version": "0.0.56"}
    )
    assert not m.health(A)


def test_unreadable_windows_identity_fails_closed(monkeypatch):
    monkeypatch.setattr(
        manager,
        "listeners",
        lambda port: [{"pid": 12, "address": "127.0.0.1", "exe": None, "command": None}],
    )
    with pytest.raises(manager.Refusal, match="withheld"):
        manager.inspect_listener(8765, [Path("C:/Hub")])


def test_legacy_vite_without_flags_is_accepted_only_for_exact_repo(monkeypatch):
    root = Path("C:/Hub")
    process = {
        "pid": 12,
        "address": "127.0.0.1",
        "exe": "node.exe",
        "command": str(root / "node_modules/vite/bin/vite.js"),
    }
    monkeypatch.setattr(manager, "listeners", lambda port: [process])
    assert manager.inspect_listener(5173, [root])["pid"] == 12
    process["command"] = '"' + str(root / "node_modules/.bin/../vite/bin/vite.js") + '"'
    assert manager.inspect_listener(5173, [root])["pid"] == 12
    process["command"] = str(root / "node_modules/vite/bin/vite.js")
    process["command"] += ".unrelated"
    with pytest.raises(manager.Refusal):
        manager.inspect_listener(5173, [root])


def test_controller_lock_releases_after_exception(tmp_path):
    path = tmp_path / "lock"
    with pytest.raises(RuntimeError), manager.controller_lock(path):
        with pytest.raises(manager.Refusal, match="BUSY"):
            with manager.controller_lock(path):
                pass
        raise RuntimeError("simulate controller failure")
    with manager.controller_lock(path):
        pass


def test_same_backend_version_still_requires_exact_release_process(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(
        manager,
        "request_json",
        lambda url: (
            {"sha": A} if "5173" in url else {"service": "Rosevear AI Hub", "version": "0.0.57"}
        ),
    )
    monkeypatch.setattr(
        manager.urllib.request,
        "urlopen",
        lambda *args, **kwargs: nullcontext(SimpleNamespace(status=200)),
    )
    monkeypatch.setattr(
        manager,
        "inspect_listener",
        lambda *args: {"command": "python.exe -m uvicorn rosevear_ai_hub.main:app"},
    )
    assert not m.health(A)
    monkeypatch.setattr(
        manager,
        "inspect_listener",
        lambda port, *args: (
            {"command": f'python.exe --app-dir "{m.slot(A) / ".venv/Lib/site-packages"}"'}
            if port == 8765
            else {
                "command": f'node.exe "{m.slot(A) / "node_modules/vite/bin/vite.js"}" preview',
                "exe": str(m.slot(A) / "runtime/node.exe"),
            }
        ),
    )
    assert m.health(A)


@pytest.mark.skipif(os.name != "nt", reason="Current-user Windows DPAPI")
def test_dpapi_memory_round_trip_and_tamper_rejection():
    private_spec = importlib.util.spec_from_file_location(
        "hub_private_backup", SCRIPT.with_name("hub_private_backup.py")
    )
    private = importlib.util.module_from_spec(private_spec)
    private_spec.loader.exec_module(private)
    secret = b"synthetic-only-private-backup-key-for-unit-test"
    encrypted = private.protect(secret)
    assert secret not in encrypted
    assert private.protect(encrypted, decrypt=True) == secret
    changed = encrypted[:-1] + bytes([encrypted[-1] ^ 1])
    with pytest.raises(RuntimeError, match="DPAPI"):
        private.protect(changed, decrypt=True)


@pytest.mark.parametrize("phase", ["activating", "rolled_back"])
def test_hourly_adoption_does_not_override_interrupted_or_failed_release(
    tmp_path, monkeypatch, phase
):
    m = prepared(tmp_path, monkeypatch)
    manager.atomic_json(m.journal, {"phase": phase, "previous": A, "candidate": B})
    monkeypatch.setattr(manager, "Manager", lambda root: m)
    monkeypatch.setattr(m, "prepare", lambda *args, **kwargs: pytest.fail("must not retry"))
    monkeypatch.setattr(manager.sys, "argv", ["controller", "apply", "--repo-root", str(tmp_path)])
    assert manager.main() == 1
    assert manager.read_json(m.status)["state"] == "HOLD"
    assert manager.read_json(m.state)["sha"] == A


def test_preview_exposes_real_schema_and_running_version_drift(tmp_path, monkeypatch):
    m = prepared(tmp_path, monkeypatch)
    monkeypatch.setattr(manager, "Manager", lambda root: m)
    monkeypatch.setattr(m, "validate_repository", lambda: None)
    monkeypatch.setattr(manager, "database_revision", lambda root: "0016")
    monkeypatch.setattr(manager, "request_json", lambda url: {"version": "0.0.56"})
    monkeypatch.setattr(manager.sys, "argv", ["controller", "check", "--repo-root", str(tmp_path)])
    assert manager.main() == 0
    report = manager.read_json(m.status)
    assert report["state"] == "HOLD"
    assert report["runtime_version"] == "0.0.56"
    assert report["live_schema"] == "0016"
    assert report["expected_schema"] == "0018"
