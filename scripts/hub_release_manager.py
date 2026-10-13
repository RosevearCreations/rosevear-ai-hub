"""Windows release slots: prepare without touching live code, activate with rollback.

Standard-library controller; never install into the controller's own environment.
Only an explicitly enrolled -Apply task may activate. No migration support.
"""

from __future__ import annotations

import argparse
import ast
import contextlib
import hashlib
import json
import ntpath
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path

OFFICIAL = "https://github.com/RosevearCreations/rosevear-ai-hub.git"
API = "https://api.github.com/repos/RosevearCreations/rosevear-ai-hub"
JOBS = {"docs-foundation", "backend", "web", "backup-windows", "desktop-windows"}
SHA = re.compile(r"^[0-9a-f]{40}$")
VERSION = re.compile(r"^\d+\.\d+\.\d+$")


class Refusal(Exception):
    """Contains only our fixed, non-secret operator guidance."""


def require(condition, message):
    if not condition:
        raise Refusal(message)


def digest(path):
    value = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".new")
    with temporary.open("w", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def request_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Rosevear-Release-Manager"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)


def eligible(sha, run, jobs):
    return bool(
        SHA.fullmatch(sha)
        and run.get("head_sha") == sha
        and run.get("head_branch") == "main"
        and run.get("event") == "push"
        and run.get("name") == "Foundation, Backend, Web and Desktop Checks"
        and run.get("status") == "completed"
        and run.get("conclusion") == "success"
        and all(
            len(found := [j for j in jobs if j.get("name") == name]) == 1
            and found[0].get("status") == "completed"
            and found[0].get("conclusion") == "success"
            for name in JOBS
        )
    )


def green_release(sha):
    require(bool(SHA.fullmatch(sha)), "GitHub returned an invalid main SHA.")
    runs = request_json(
        API
        + "/actions/workflows/foundation.yml/runs?branch=main&event=push"
        + f"&head_sha={sha}&per_page=100"
    )
    matches = [r for r in runs["workflow_runs"] if r.get("head_sha") == sha]
    require(bool(matches), "HOLD: latest main has no independent push CI run yet.")
    run = matches[0]
    jobs = request_json(API + f"/actions/runs/{run['id']}/jobs?per_page=100")
    require(
        jobs["total_count"] <= 100 and eligible(sha, run, jobs["jobs"]),
        "HOLD: latest main must pass all five jobs on the exact push SHA.",
    )
    return sha


def green_main():
    return green_release(request_json(API + "/branches/main")["commit"]["sha"])


def schema_head(slot):
    revisions, parents = set(), set()
    for file in (slot / "server/alembic/versions").glob("*.py"):
        for node in ast.parse(file.read_text(encoding="utf-8-sig")).body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id in {"revision", "down_revision"}:
                        value = ast.literal_eval(node.value)
                        if target.id == "revision":
                            revisions.add(value)
                        elif isinstance(value, str):
                            parents.add(value)
            elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
                if node.target.id in {"revision", "down_revision"}:
                    value = ast.literal_eval(node.value)
                    if node.target.id == "revision":
                        revisions.add(value)
                    elif isinstance(value, str):
                        parents.add(value)
    heads = revisions - parents
    require(len(heads) == 1, "Cannot establish a single schema head without executing migrations.")
    return heads.pop()


def database_revision(root):
    # Read-only SQLite access; no migration, checkpoint or live restore.
    db = (root / "data/rosevear_ai_hub.db").resolve()
    with contextlib.closing(sqlite3.connect(db.as_uri() + "?mode=ro", uri=True)) as connection:
        rows = connection.execute("SELECT version_num FROM alembic_version").fetchall()
    require(len(rows) == 1, "Cannot identify the live database schema revision.")
    return rows[0][0]


def run(args, cwd, label, *, env=None, timeout=1800):
    # Child tools can print credentials embedded in URLs. Keep their output out
    # of logs/reports; report the fixed step, exit code and remedy instead.
    args = [str(a) for a in args]
    require(
        Path(args[0]).suffix.lower() not in {".cmd", ".bat"},
        "Use a direct executable/Node CLI; batch shell invocation is not permitted.",
    )
    try:
        result = subprocess.run(
            args,
            cwd=cwd,
            env=env,
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired:
        raise Refusal(
            f"{label}: timed out; live services were not modified by this step."
        ) from None
    if result.returncode:
        guidance = "Verify tool availability, access and network; retry isolated preparation."
        if "backup" in label.lower():
            guidance = (
                "Verify current-user DPAPI enrollment, backup ACL/free space and restore drill."
            )
        elif "Windows process" in label:
            guidance = (
                "Run as the approved Hub user with administrator-readable CIM process identity."
            )
        elif "Test isolated" in label:
            output = result.stdout.decode("utf-8", errors="replace")
            failures = re.findall(r"FAILED (server/tests/[A-Za-z0-9_/.]+::[A-Za-z0-9_]+)", output)
            guidance = (
                "Failed tests: " + ", ".join(failures[:5])
                if failures
                else "Run the named test step inside the retained failed slot; do not activate it."
            )
        raise Refusal(f"{label}: exit {result.returncode}. {guidance}")
    return result.stdout.decode("utf-8", errors="replace").strip()


def git(root, *args):
    return run(["git.exe", *args], root, "Git verification", timeout=120)


def clean_test_environment():
    # Do not inherit household credentials/endpoints into package build/tests.
    names = (
        "SYSTEMROOT",
        "WINDIR",
        "COMSPEC",
        "PATH",
        "PATHEXT",
        "TEMP",
        "TMP",
        "USERPROFILE",
        "APPDATA",
        "LOCALAPPDATA",
        "PROGRAMFILES",
        "PROGRAMFILES(X86)",
    )
    env = {k: v for k, v in os.environ.items() if k.upper() in names}
    env.update(
        {
            "PYTHONDONTWRITEBYTECODE": "1",
            "HOME_ASSISTANT_URL": "",
            "MQTT_HOST": "",
            "APP_ENV": "development",
        }
    )
    return env


def schema_changed(paths):
    return any(p.startswith("server/alembic/") or p in {"alembic.ini"} for p in paths)


def high_risk_changed(paths):
    # Runtime data migrations and deployment-control changes require operator review.
    return any(p.startswith(("scripts/", ".github/", "infra/")) for p in paths)


def verify_backup(evidence, max_hours=24):
    record = read_json(evidence)
    require(
        record.get("status") == "pass"
        and record.get("drill_type") == "operator_archive"
        and record.get("sqlite_integrity") == "ok"
        and record.get("sqlite_table_count", 0) > 0
        and record.get("restore_to_live_installation") is False
        and record.get("scratch_cleanup_verified") is True,
        "HOLD: a real encrypted backup with completed isolated restore evidence is required.",
    )
    name = record.get("archive_filename", "")
    require(
        Path(name).name == name and name.endswith(".hubbackup"),
        "Backup evidence archive filename is invalid.",
    )
    archive = Path(evidence).parent / name
    require(
        archive.is_file()
        and not archive.is_symlink()
        and digest(archive) == record.get("archive_sha256"),
        "HOLD: encrypted backup is missing or differs from the restore-verified archive.",
    )
    completed = datetime.fromisoformat(record["completed_at_utc"])
    age = (datetime.now(UTC) - completed).total_seconds()
    require(
        0 <= age <= max_hours * 3600,
        "HOLD: backup verification is stale; make and rehearse a fresh backup.",
    )
    return record


@contextlib.contextmanager
def controller_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        handle = path.open("a+b")
    except OSError as error:
        if getattr(error, "winerror", None) in {32, 33}:
            raise Refusal("BUSY: Windows recovery holds the maintenance lock.") from None
        raise
    with handle:
        handle.seek(0)
        if path.stat().st_size == 0:
            handle.write(b"0")
            handle.flush()
        handle.seek(0)
        if os.name == "nt":
            import msvcrt

            try:
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError:
                raise Refusal(
                    "BUSY: another Hub deployment or recovery pass holds the maintenance lock."
                ) from None
        else:
            import fcntl

            try:
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                raise Refusal(
                    "BUSY: another Hub deployment or recovery pass holds the maintenance lock."
                ) from None
        try:
            yield
        finally:
            if os.name == "nt":
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)


def ps_json(script):
    import base64

    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    value = run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        Path.cwd(),
        "Windows process inspection",
        timeout=30,
    )
    return json.loads(value or "[]")


def listeners(port):
    return ps_json(
        "$ErrorActionPreference='Stop'; "
        "$items=@(Get-NetTCPConnection -State Listen -ErrorAction Stop | "
        f"Where-Object LocalPort -eq {int(port)}); $result=@(foreach($i in $items) {{"
        "$p=Get-CimInstance Win32_Process -Filter ('ProcessId = '+$i.OwningProcess); "
        "[pscustomobject]@{pid=$i.OwningProcess;address=$i.LocalAddress;exe=$p.ExecutablePath;command=$p.CommandLine;"
        "created=[string]$p.CreationDate}}); ConvertTo-Json -InputObject $result -Compress"
    )


def inspect_listener(port, roots):
    items = listeners(port)
    if not items:
        return None
    require(
        len({i["pid"] for i in items}) == 1
        and all(i["address"] in {"127.0.0.1", "::1"} for i in items),
        f"Port {port}: ambiguous or exposed listener; nothing stopped.",
    )
    p = items[0]
    require(
        bool(p.get("exe") and p.get("command")),
        f"Port {port}: Windows withheld process identity; "
        "run the supervised check as administrator.",
    )
    command = p["command"].replace("/", "\\").lower()
    tokens = [
        quoted or bare
        for quoted, bare in re.findall(r'(?<!\S)(?:"([^"]+)"|(\S+))(?=\s|$)', command)
    ]
    if port == 8765:
        allowed = [r / ".venv" / "Scripts" / "python.exe" for r in roots]
        allowed.append(
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs/Python/Python311/python.exe"
        )
        owned = any(str(r).lower() == p["exe"].lower() for r in allowed)
        owned &= bool(re.search(r"(?:^|\s)-m\s+uvicorn(?:\s|$)", command))
        owned &= bool(re.search(r"(?:^|\s)rosevear_ai_hub\.main:app(?:\s|$)", command))
        app_dir = ""
        if "--app-dir" in tokens and tokens.index("--app-dir") + 1 < len(tokens):
            app_dir = tokens[tokens.index("--app-dir") + 1]
        managed = any(
            ntpath.normpath(app_dir) == ntpath.normpath(str(r / ".venv/Lib/site-packages")).lower()
            for r in roots[1:]
        )
        if not managed:
            identity = request_json("http://127.0.0.1:8765/version")
            owned &= identity.get("service") == "Rosevear AI Hub" and bool(
                VERSION.fullmatch(identity.get("version", ""))
            )
    else:
        owned = Path(p["exe"]).name.lower() == "node.exe"
        # Actual listener is loopback AND command names this repo's Vite entry.
        # Legacy npm web:dev uses vite.config.ts, so flags need not be explicit.
        entries = [ntpath.normpath(token).lower() for token in tokens]
        owned &= any(
            ntpath.normpath(str(r / prefix / "vite/bin/vite.js")).lower() in entries
            for r in roots
            for prefix in ("node_modules", "apps/web/node_modules")
        )
    require(owned, f"Port {port}: listener is not a verified Hub process; nothing stopped.")
    return p


def stop_verified(port, roots, expected=None):
    p = inspect_listener(port, roots)
    if p is None:
        return
    require(
        expected is None or (p["pid"], p["created"]) == (expected["pid"], expected["created"]),
        f"Port {port}: process changed since inspection; nothing stopped.",
    )
    # Recheck PID and creation timestamp inside the same Windows command.
    created = p["created"].replace("'", "''")
    ps_json(
        "$ErrorActionPreference='Stop'; "
        f"$p=Get-CimInstance Win32_Process -Filter 'ProcessId = {p['pid']}'; "
        f"if (!$p -or [string]$p.CreationDate -ne '{created}') {{throw 'PID changed'}}; "
        f"Stop-Process -Id {p['pid']} -ErrorAction Stop; 'true'"
    )
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if not listeners(port):
            return
        time.sleep(1)
    raise Refusal(f"Port {port} did not close; duplicate startup refused.")


class Manager:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.home = self.root / "logs" / "hub-deployment"
        self.slots = self.home / "releases"
        self.state = self.home / "active.json"
        self.journal = self.home / "activation.json"
        self.status = self.root / "logs" / "hub-release-adoption.json"
        self.step = "preflight"
        self.operation = uuid.uuid4().hex

    def record(self, state, detail, **fields):
        self.home.mkdir(parents=True, exist_ok=True)
        atomic_json(
            self.status,
            {
                "checked_utc": datetime.now(UTC).isoformat(),
                "state": state,
                "step": self.step,
                "detail": detail,
                "operation": self.operation,
                **fields,
            },
        )
        # Fixed messages only; never raw command output or exception text.
        with (self.root / "logs/hub-release-adoption.log").open("a", encoding="utf-8") as stream:
            stream.write(f"{datetime.now(UTC).isoformat()} {state} {self.step}: {detail}\n")

    def slot(self, sha):
        require(bool(SHA.fullmatch(sha)), "Invalid release SHA.")
        path = self.slots / sha
        require(
            path.resolve().parent == self.slots.resolve()
            and path.resolve().is_relative_to(self.root)
            and not path.is_symlink(),
            "Release slot path is unsafe.",
        )
        return path

    def manifest(self, sha):
        path = self.slot(sha)
        m = read_json(path / "release.json")
        require(
            m["sha"] == sha and m["tests_passed"] is True,
            "Release slot has not passed preparation.",
        )
        require(git(path, "rev-parse", "HEAD") == sha, "Release slot source SHA changed.")
        require(
            digest(path / "package-lock.json") == m["node_lock_sha256"],
            "Release Node lock changed.",
        )
        require(
            digest(path / "python-freeze.txt") == m["python_freeze_sha256"],
            "Release Python inventory changed.",
        )
        require(
            digest(m["base_python"]) == m["base_python_sha256"],
            "Base Python executable changed; re-prepare release.",
        )
        require(
            digest(path / "runtime/node.exe") == m["node_sha256"],
            "Retained Node executable changed.",
        )
        # Full source, installed packages and dist are fingerprinted; caches/logs
        # are excluded so normal runtime operation does not invalidate rollback.
        require(
            self.tree_hash(path) == m["tree_sha256"],
            "Release source/dependencies/build changed; activation refused.",
        )
        return m

    @staticmethod
    def tree_hash(path):
        value = hashlib.sha256()
        for folder in (
            "server/src",
            "apps/web/dist",
            ".venv",
            "node_modules",
            "apps/web/node_modules",
        ):
            parent = path / folder
            if not parent.exists():
                continue
            for file in sorted(parent.rglob("*")):
                if file.is_file() and "__pycache__" not in file.parts and file.suffix != ".pyc":
                    require(not file.is_symlink(), "Release tree contains an unexpected file link.")
                    value.update(file.relative_to(path).as_posix().encode())
                    value.update(digest(file).encode())
        return value.hexdigest()

    def validate_repository(self):
        require(
            git(self.root, "branch", "--show-current") == "main", "Live checkout must stay on main."
        )
        require(
            git(self.root, "remote", "get-url", "origin") == OFFICIAL,
            "Live origin must be the official HTTPS repository.",
        )
        require(
            not git(self.root, "status", "--porcelain", "--untracked-files=no"),
            "Tracked live edits block preparation.",
        )

    def prepare(self, sha, historical=False, allow_reviewed=False):
        self.step = "isolated preparation"
        self.validate_repository()
        path = self.slot(sha)
        if (path / "release.json").is_file():
            return self.manifest(sha)
        if path.exists():
            # Retain failed preparation; an hourly retry never deletes local work.
            failed = self.home / "failed"
            failed.mkdir(exist_ok=True)
            destination = failed / (sha + "-" + uuid.uuid4().hex)
            require(
                path.resolve().parent == self.slots.resolve()
                and destination.resolve().parent == failed.resolve()
                and destination.resolve().is_relative_to(self.root),
                "Failed-slot archive path escaped the deployment workspace.",
            )
            path.rename(destination)
        require(
            shutil.disk_usage(self.root).free >= 5 * 1024**3,
            "HOLD: less than 5 GiB free; retain rollback slots and free space before staging.",
        )
        self.slots.mkdir(parents=True, exist_ok=True)
        run(
            ["git.exe", "clone", "--no-hardlinks", "--no-checkout", str(self.root), str(path)],
            self.root,
            "Clone isolated source",
        )
        git(path, "remote", "set-url", "origin", OFFICIAL)
        git(path, "fetch", "origin", "main")
        if historical:
            green_release(sha)
            git(path, "merge-base", "--is-ancestor", sha, "origin/main")
        else:
            require(
                git(path, "rev-parse", "origin/main") == sha,
                "Main changed while preparing; retry later.",
            )
        git(path, "checkout", "--detach", sha)
        if self.state.exists() and not historical:
            previous = read_json(self.state)["sha"]
            git(path, "merge-base", "--is-ancestor", previous, sha)
            paths = git(path, "diff", "--name-only", previous, sha).splitlines()
            require(not schema_changed(paths), "HOLD: schema change requires operator review.")
            require(
                allow_reviewed or not high_risk_changed(paths),
                "HOLD: deployment/infra changes require review before dependency staging.",
            )
        env = clean_test_environment()
        base = Path(sys._base_executable).resolve()
        run(
            [base, "-B", "-m", "venv", str(path / ".venv")],
            path,
            "Create isolated Python environment",
            env=env,
        )
        python = path / ".venv/Scripts/python.exe"
        run(
            [python, "-B", "-m", "pip", "install", ".[dev]"],
            path,
            "Install isolated Python dependencies",
            env=env,
        )
        freeze = run(
            [python, "-B", "-m", "pip", "freeze", "--all"],
            path,
            "Inventory Python dependencies",
            env=env,
        )
        (path / "python-freeze.txt").write_text(freeze, encoding="utf-8")
        npm = shutil.which("npm.cmd")
        node = shutil.which("node.exe")
        require(bool(npm and node), "Node/npm unavailable on scheduled identity PATH.")
        npm_cli = Path(npm).parent / "node_modules/npm/bin/npm-cli.js"
        require(npm_cli.is_file(), "npm CLI missing beside npm.cmd; verify the Node installation.")
        npm_command = [node, npm_cli]
        if not (path / "package-lock.json").exists():
            run(
                npm_command
                + [
                    "install",
                    "--package-lock-only",
                    "--ignore-scripts",
                    "--no-audit",
                    "--no-fund",
                ],
                path,
                "Resolve isolated Node lock",
                env=env,
            )
        run(
            npm_command + ["ci", "--no-audit", "--no-fund"],
            path,
            "Install isolated Node dependencies",
            env=env,
        )
        version = run(
            [python, "-B", "-c", "import rosevear_ai_hub; print(rosevear_ai_hub.__version__)"],
            path,
            "Read staged version",
            env=env,
        )
        require(bool(VERSION.fullmatch(version)), "Staged backend version is invalid.")
        public = path / "apps/web/public"
        public.mkdir(exist_ok=True)
        atomic_json(public / "__hub_release.json", {"sha": sha, "version": version})
        run(npm_command + ["run", "web:build"], path, "Build isolated frontend", env=env)
        run(
            [python, "-B", "-m", "pytest", "-p", "no:cacheprovider"],
            path,
            "Test isolated backend",
            env=env,
        )
        run(npm_command + ["run", "web:test"], path, "Test isolated frontend", env=env)
        (path / "runtime").mkdir()
        shutil.copy2(node, path / "runtime/node.exe")
        manifest = {
            "sha": sha,
            "version": version,
            "tests_passed": True,
            "base_python": str(base),
            "base_python_sha256": digest(base),
            "node_sha256": digest(path / "runtime/node.exe"),
            "node_lock_sha256": digest(path / "package-lock.json"),
            "python_freeze_sha256": digest(path / "python-freeze.txt"),
            "tree_sha256": self.tree_hash(path),
            "schema_revision": schema_head(path),
        }
        atomic_json(path / "release.json", manifest)
        self.record(
            "STAGED",
            "Isolated source, environments, build and tests passed; no live restart.",
            release=sha,
            expected_version=version,
        )
        return manifest

    def roots(self, *shas):
        return [self.root, *(self.slot(s) for s in shas if s)]

    def health(self, sha):
        try:
            m = read_json(self.slot(sha) / "release.json")
            v = request_json("http://127.0.0.1:8765/version")
            marker = request_json("http://127.0.0.1:5173/__hub_release.json")
            with urllib.request.urlopen("http://127.0.0.1:8765/health", timeout=4) as response:
                ok = response.status == 200
            healthy = (
                ok
                and v.get("service") == "Rosevear AI Hub"
                and v.get("version") == m["version"]
                and marker.get("sha") == sha
            )
            if not healthy:
                return False
            api = inspect_listener(8765, self.roots(sha))
            web = inspect_listener(5173, self.roots(sha))
            expected = ntpath.normpath(str(self.slot(sha) / ".venv/Lib/site-packages")).lower()
            api_tokens = (
                [
                    ntpath.normpath(a or b).lower()
                    for a, b in re.findall(r'(?<!\S)(?:"([^"]+)"|(\S+))(?=\s|$)', api["command"])
                ]
                if api
                else []
            )
            web_tokens = (
                [
                    ntpath.normpath(a or b).lower()
                    for a, b in re.findall(r'(?<!\S)(?:"([^"]+)"|(\S+))(?=\s|$)', web["command"])
                ]
                if web
                else []
            )
            vite_entries = [
                ntpath.normpath(str(self.slot(sha) / prefix / "vite/bin/vite.js")).lower()
                for prefix in ("node_modules", "apps/web/node_modules")
            ]
            node = ntpath.normpath(str(self.slot(sha) / "runtime/node.exe")).lower()
            return bool(
                web
                and expected in api_tokens
                and ntpath.normpath(web.get("exe", "")).lower() == node
                and any(entry in web_tokens for entry in vite_entries)
            )
        except (OSError, ValueError, KeyError):
            return False

    def start(self, sha, missing_only=False):
        path = self.slot(sha)
        self.manifest(sha)
        present = {port: inspect_listener(port, self.roots(sha)) for port in (8765, 5173)}
        require(
            missing_only or not any(present.values()),
            "Startup requires both Hub ports free; duplicate launch refused.",
        )
        env = os.environ.copy()
        env.pop("PYTHONPATH", None)
        env.pop("PYTHONHOME", None)
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["REMOTE_WEB_DIST_DIR"] = str(path / "apps/web/dist")
        # Working directory stays live: .env and relative data paths are retained.
        api = [
            path / ".venv/Scripts/python.exe",
            "-B",
            "-m",
            "uvicorn",
            "rosevear_ai_hub.main:app",
            "--app-dir",
            path / ".venv/Lib/site-packages",
            "--host",
            "127.0.0.1",
            "--port",
            "8765",
        ]
        vite = path / "node_modules/vite/bin/vite.js"
        if not vite.exists():
            vite = path / "apps/web/node_modules/vite/bin/vite.js"
        web = [
            path / "runtime/node.exe",
            vite,
            "preview",
            "--host",
            "127.0.0.1",
            "--port",
            "5173",
            "--strictPort",
        ]
        for label, args, cwd in (("backend", api, self.root), ("web", web, path / "apps/web")):
            if present[8765 if label == "backend" else 5173]:
                continue
            with (
                (self.home / f"{label}-stdout.log").open("ab") as stdout,
                (self.home / f"{label}-stderr.log").open("ab") as stderr,
            ):
                subprocess.Popen(
                    [str(a) for a in args],
                    cwd=cwd,
                    env=env,
                    stdout=stdout,
                    stderr=stderr,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if self.health(sha):
                return
            time.sleep(2)
        raise Refusal(
            "Activation health failed; reverting to the retained previous source/environment."
        )

    def rollback(self, previous, candidate):
        self.step = "rollback"
        self.manifest(previous)  # Never stop services without a valid retained fallback.
        roots = self.roots(previous, candidate)
        stop_verified(5173, roots)
        stop_verified(8765, roots)
        self.start(previous)
        atomic_json(self.state, {"sha": previous})
        atomic_json(
            self.journal, {"phase": "rolled_back", "previous": previous, "candidate": candidate}
        )
        self.record(
            "ROLLED_BACK",
            "Previous retained source, Python packages and Node build are healthy; "
            "adoption failed.",
            release=candidate,
            active_release=previous,
        )

    def activate(self, sha, baseline, evidence, allow_reviewed=False):
        self.step = "activation preflight"
        previous = read_json(self.state)["sha"] if self.state.exists() else baseline
        require(
            bool(previous),
            "First activation requires an explicitly prepared, tested baseline slot.",
        )
        self.manifest(previous)
        self.manifest(sha)
        verify_backup(evidence)
        require(
            database_revision(self.root)
            == read_json(self.slot(sha) / "release.json")["schema_revision"],
            "HOLD: live database schema differs from candidate. "
            "Review migrations separately; no service stopped.",
        )
        require(
            database_revision(self.root)
            == read_json(self.slot(previous) / "release.json")["schema_revision"],
            "HOLD: retained rollback release is incompatible with the live schema.",
        )
        require(green_main() == sha, "Latest GREEN main changed; activation deferred.")
        paths = git(self.slot(sha), "diff", "--name-only", previous, sha).splitlines()
        require(
            not schema_changed(paths),
            "HOLD: schema change requires separate backup/migration approval.",
        )
        require(
            allow_reviewed or not high_risk_changed(paths),
            "HOLD: deployment/infra changes need operator review.",
        )
        if not self.state.exists():
            version = request_json("http://127.0.0.1:8765/version").get("version")
            require(
                version == read_json(self.slot(previous) / "release.json")["version"],
                "Prepared baseline version must match the legacy running backend.",
            )
        roots = self.roots(previous, sha)
        api = inspect_listener(8765, roots)
        web = inspect_listener(5173, roots)
        require(
            api and web, "Both existing Hub services must be identified before initial activation."
        )
        # Recovery shares this OS lock: no scheduled task is disabled or edited.
        # A dead controller releases the lock; recovery sees this durable journal
        # and reverts to the previous slot on its next pass.
        atomic_json(self.journal, {"phase": "activating", "previous": previous, "candidate": sha})
        try:
            self.step = "bounded process switch"
            stop_verified(5173, roots, web)
            stop_verified(8765, roots, api)
            self.start(sha)
            atomic_json(self.state, {"sha": sha})
            atomic_json(
                self.journal, {"phase": "committed", "previous": previous, "candidate": sha}
            )
        except Exception:
            try:
                self.rollback(previous, sha)
            except Exception:
                self.record(
                    "ROLLBACK_FAILED",
                    "Activation and rollback failed. Recovery will retry the retained baseline; "
                    "inspect ports and local runtime logs. No unrelated process was stopped.",
                    release=sha,
                )
            raise
        self.record(
            "ADOPTED",
            "Backend version and frontend exact release marker verified; "
            "recovery task was never disabled.",
            release=sha,
        )

    def fresh_backup(self):
        self.step = "encrypted backup and isolated restore"
        require(
            (self.root / "logs/private-recovery/backup-key.dpapi").is_file(),
            "HOLD: privately enroll and test a current-user DPAPI backup key "
            "before unattended activation.",
        )
        helper = Path(__file__).with_name("hub_private_backup.py")
        evidence = run(
            [sys.executable, "-B", helper, "create", "--repo-root", self.root],
            self.root,
            "Create and restore-verify encrypted backup",
            timeout=1800,
        )
        path = Path(evidence)
        require(
            path.resolve().parent == (self.root / "logs/private-recovery").resolve(),
            "Backup helper returned an unexpected evidence path.",
        )
        verify_backup(path)
        return path

    def validate_database_config(self, sha):
        # Inspect only a boolean; never return DATABASE_URL or other .env values.
        python = self.slot(sha) / ".venv/Scripts/python.exe"
        script = (
            "from rosevear_ai_hub.config import get_settings; "
            "from sqlalchemy.engine import make_url; from pathlib import Path; "
            "u=make_url(get_settings().database_url); "
            "print(u.get_backend_name()=='sqlite' and "
            "Path(u.database).resolve()==Path('data/rosevear_ai_hub.db').resolve())"
        )
        env = os.environ.copy()
        env.pop("PYTHONPATH", None)
        env.pop("PYTHONHOME", None)
        require(
            run(
                [python, "-B", "-c", script],
                self.root,
                "Validate backup/database configuration",
                env=env,
            )
            == "True",
            "HOLD: configured database differs from the supported backup source; "
            "review it privately.",
        )

    def recover(self):
        if self.journal.exists():
            j = read_json(self.journal)
            if j["phase"] == "activating":
                self.rollback(j["previous"], j["candidate"])
                return
        require(self.state.exists(), "No managed release is enrolled.")
        sha = read_json(self.state)["sha"]
        if self.health(sha):
            return
        # Never kill a failing listener from a periodic recovery pass.
        # Start both only when both are gone; partial outage needs inspection.
        self.start(sha, missing_only=True)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "action",
        choices=[
            "check",
            "stage",
            "stage-baseline",
            "apply",
            "recover",
            "inspect-runtime",
            "inspect-schema",
            "rollback",
        ],
    )
    p.add_argument("--repo-root", type=Path, required=True)
    p.add_argument("--baseline", default="")
    p.add_argument("--backup-evidence", type=Path)
    p.add_argument("--reviewed-control-changes", action="store_true")
    p.add_argument("--expected-commit", default="")
    p.add_argument("--retry-failed-release", action="store_true")
    args = p.parse_args()
    manager = Manager(args.repo_root)
    sha = ""
    try:
        lock_name = (
            "maintenance.lock"
            if args.action in {"recover", "inspect-runtime", "rollback"}
            else "controller.lock"
        )
        with controller_lock(manager.home / lock_name):
            if args.action == "recover":
                manager.recover()
            elif args.action == "inspect-schema":
                require(
                    database_revision(manager.root) == schema_head(manager.root),
                    "HOLD: live schema differs from checkout; legacy startup is blocked.",
                )
            elif args.action == "inspect-runtime":
                require(
                    not manager.journal.exists()
                    or read_json(manager.journal)["phase"] != "activating",
                    "Interrupted activation must finish recovery before enrollment.",
                )
                require(
                    manager.state.exists() and manager.health(read_json(manager.state)["sha"]),
                    "Managed runtime is not healthy.",
                )
            elif args.action == "stage-baseline":
                require(bool(args.baseline), "Baseline SHA is required.")
                manager.prepare(args.baseline, historical=True)
            elif args.action == "rollback":
                require(manager.journal.exists(), "No activation journal exists for rollback.")
                j = read_json(manager.journal)
                manager.rollback(j["previous"], j["candidate"])
            else:
                sha = green_main()
                require(
                    not args.expected_commit or args.expected_commit == sha,
                    "GREEN main differs from the explicitly reviewed SHA; nothing activated.",
                )
                require(
                    not (args.reviewed_control_changes or args.retry_failed_release)
                    or args.expected_commit == sha,
                    "Operator overrides must be bound to an explicit --expected-commit SHA.",
                )
                if args.action == "check":
                    manager.validate_repository()
                    current = read_json(manager.state)["sha"] if manager.state.exists() else None
                    state = "CURRENT" if current == sha and manager.health(sha) else "READY"
                    checkout = git(manager.root, "rev-parse", "HEAD")
                    expected_schema = None
                    if (manager.slot(sha) / "release.json").is_file():
                        expected_schema = read_json(manager.slot(sha) / "release.json")[
                            "schema_revision"
                        ]
                    elif checkout == sha:
                        expected_schema = schema_head(manager.root)
                    actual_schema = database_revision(manager.root)
                    if expected_schema and actual_schema != expected_schema:
                        state = "HOLD"
                    try:
                        v = request_json("http://127.0.0.1:8765/version").get("version", "")
                        runtime_version = v if VERSION.fullmatch(v) else "unverified"
                    except (OSError, ValueError):
                        runtime_version = "unavailable"
                    manager.record(
                        state,
                        "Live schema requires separate migration review; no services changed."
                        if state == "HOLD"
                        else "GREEN main checked against runtime; "
                        "READY requires isolated staging and backup gates.",
                        release=sha,
                        source_checkout_commit=checkout,
                        runtime_version=runtime_version,
                        live_schema=actual_schema,
                        expected_schema=expected_schema,
                    )
                else:
                    if args.action == "apply" and manager.journal.exists():
                        journal = read_json(manager.journal)
                        require(
                            journal["phase"] != "activating",
                            "HOLD: interrupted activation must finish recovery before adoption.",
                        )
                        require(
                            args.retry_failed_release
                            or journal["phase"] != "rolled_back"
                            or journal["candidate"] != sha,
                            "HOLD: this release failed activation and is quarantined; "
                            "wait for a newer GREEN release or explicitly review a retry.",
                        )
                    manager.prepare(sha, allow_reviewed=args.reviewed_control_changes)
                    if args.action == "apply":
                        if (
                            manager.state.exists()
                            and read_json(manager.state)["sha"] == sha
                            and manager.health(sha)
                        ):
                            manager.record(
                                "CURRENT",
                                "Exact managed backend/frontend release is healthy.",
                                release=sha,
                            )
                        else:
                            manager.validate_database_config(sha)
                            evidence = args.backup_evidence or manager.fresh_backup()
                            with controller_lock(manager.home / "maintenance.lock"):
                                manager.activate(
                                    sha, args.baseline, evidence, args.reviewed_control_changes
                                )
        return 0
    except Exception as error:
        detail = (
            str(error)
            if isinstance(error, Refusal)
            else f"Unexpected {type(error).__name__}; inspect local step and runtime logs. "
            "No raw exception/secret was recorded."
        )
        if isinstance(error, urllib.error.HTTPError):
            detail = (
                f"HTTP metadata/health request failed with status {error.code}; "
                "check public GitHub availability/rate limits and local Hub health. "
                "No unverified release was activated."
            )
        if detail.startswith("BUSY:"):
            print(detail)
            return 0 if args.action == "recover" else 3
        # Preserve the operationally important rollback result.
        prior = read_json(manager.status) if manager.status.exists() else {}
        if prior.get("operation") != manager.operation or prior.get("state") not in {
            "ROLLED_BACK",
            "ROLLBACK_FAILED",
        }:
            manager.record("HOLD" if detail.startswith("HOLD:") else "FAILED", detail, release=sha)
        print(detail)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
