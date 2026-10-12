"""Build 051: anonymous loopback release smoke, safe reporting and fail-closed probes."""

import json

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from rosevear_ai_hub import __version__
from rosevear_ai_hub.database import build_engine, get_session
from rosevear_ai_hub.main import create_app
from rosevear_ai_hub.models import Base
from rosevear_ai_hub.production_readiness import (
    LOOPBACK_API,
    PATHS,
    check_readiness,
    main,
    write_evidence,
)


def _client(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'readiness-test.db'}")
    Base.metadata.create_all(engine)
    maker = sessionmaker(bind=engine, expire_on_commit=False)

    def override():
        with maker() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override
    return TestClient(app)


def test_real_app_readiness_is_metadata_only_and_unauthenticated(tmp_path):
    client = _client(tmp_path)
    seen = []

    def get(path):
        seen.append(path)
        return client.get(path)

    result = check_readiness(get)
    assert result["status"] == "pass"
    assert result["expected_version"] == __version__
    assert all(result["checks"].values())
    assert seen == list(PATHS)
    assert result["lan_tailnet_acceptance"] == "not_tested"
    assert result["household_recovery_acceptance"] == "not_tested"
    assert result["service_changes_made"] is False
    serialized = json.dumps(result).lower()
    assert "password" not in serialized
    assert "secret" not in serialized
    assert "http://" not in serialized
    assert "cookie" not in serialized


def test_version_drift_or_public_private_route_fail_closed(tmp_path):
    client = _client(tmp_path)
    stale = check_readiness(client.get, expected_version="0.0.999")
    assert stale["status"] == "fail"
    assert stale["checks"]["expected_version"] is False

    def unsafe(path):
        if path == "/api/v1/system/resource-budget":
            return httpx.Response(200, json={"credentials": "must not be reported"})
        return client.get(path)

    leaked = check_readiness(unsafe)
    assert leaked["status"] == "fail"
    assert leaked["checks"]["unauthenticated_resources_are_denied"] is False
    assert "credentials" not in json.dumps(leaked)


def test_redirects_are_not_followed_and_fail_readiness(tmp_path):
    client = _client(tmp_path)

    def redirect(path):
        if path == "/health":
            return httpx.Response(302, headers={"location": "https://example.invalid/"})
        return client.get(path)

    report = check_readiness(redirect)
    assert report["status"] == "fail"
    assert report["checks"]["health_online"] is False
    assert "example.invalid" not in json.dumps(report)


def test_unreachable_probe_is_failed_with_no_private_exception_details(tmp_path):
    client = _client(tmp_path)

    def offline(path):
        if path == "/version":
            request = httpx.Request("GET", LOOPBACK_API + path)
            raise httpx.ConnectError("private hostname and password", request=request)
        return client.get(path)

    report = check_readiness(offline)
    assert report["status"] == "fail"
    assert report["checks"]["expected_version"] is False
    assert "private hostname" not in json.dumps(report)


def test_evidence_exclusive_create_and_refusal(tmp_path):
    destination = tmp_path / "release-readiness.json"
    report = {"status": "fail", "checks": {"api": False}}
    write_evidence(destination, report)
    assert json.loads(destination.read_text(encoding="utf-8")) == report
    with pytest.raises(ValueError, match="new file"):
        write_evidence(destination, {"status": "pass"})
    assert json.loads(destination.read_text(encoding="utf-8")) == report
    assert main(["--evidence", str(destination)]) == 2


def test_cli_uses_only_fixed_loopback_target(monkeypatch, capsys, tmp_path):
    client = _client(tmp_path)
    calls = []

    class FakeClient:
        def __init__(self, **kwargs):
            calls.append(kwargs)

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def get(self, path):
            return client.get(path)

    monkeypatch.setattr("rosevear_ai_hub.production_readiness.httpx.Client", FakeClient)
    assert main([]) == 0
    assert calls == [
        {
            "base_url": LOOPBACK_API,
            "trust_env": False,
            "follow_redirects": False,
            "timeout": 2.0,
        }
    ]
    output = capsys.readouterr().out
    assert "5/5" in output
    assert "operator acceptance" in output
