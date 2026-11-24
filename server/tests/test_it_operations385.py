"""Build385 tests: source honesty, local process observations and owner ticket custody."""

import sqlite3

import pytest
from fastapi.testclient import TestClient

from rosevear_ai_hub.it_operations385 import (
    create_ticket385,
    original_host385,
    runtime_snapshot385,
    service_desk_snapshot385,
    transition_ticket385,
)
from rosevear_ai_hub.main import app

NOW385 = 1_800_000_000_000


def make385(path, *, app_id="rosevear-ai-hub", owner=123):
    return create_ticket385(
        path,
        app_id=app_id,
        category="incident",
        summary_code="SERVICE_UNAVAILABLE",
        target_hours=24,
        evidence_kind="OWNER_REPORT_UNVERIFIED",
        evidence_sha256=None,
        owner_user_id=owner,
        now_ms=NOW385,
        original_host=True,
    )


def test_original_host_gate_fails_closed():
    assert not original_host385(machine_name="OTHER-LAPTOP", windows_host=True)
    assert not original_host385(machine_name="DESKTOP-AE894KC", windows_host=False)
    assert original_host385(machine_name="desktop-ae894kc", windows_host=True)
    snapshot = runtime_snapshot385(now_ms=NOW385, original_host=False)
    assert snapshot["status"] == "HOLD_NOT_ORIGINAL_WINDOWS_HOST"
    assert snapshot["osBootIndependentlyWitnessed"] is False
    assert snapshot["hubApiUptimeSeconds"] is None
    assert snapshot["lan"]["internetReachabilityVerified"] is False
    assert snapshot["lan"]["lanHealthyIndependentlyVerified"] is False
    assert snapshot["automaticRepairAuthorized"] is False
    assert snapshot["liveThreeMasterDeliveryVerified"] is False


def test_measured_local_snapshot_never_claims_remote_connection():
    snapshot = runtime_snapshot385(now_ms=NOW385, original_host=True)
    assert snapshot["status"] in (
        "LOCAL_RUNTIME_DIAGNOSTICS_ONLY",
        "HOLD_RUNTIME_SAMPLE_UNAVAILABLE",
    )
    assert snapshot["osBootIndependentlyWitnessed"] is False
    assert snapshot["restartHistoryIndependentlyVerified"] is False
    assert snapshot["lan"]["gatewayReachabilityVerified"] is False
    assert snapshot["lan"]["internetReachabilityVerified"] is False
    assert snapshot["webCanRestartServices"] is False
    for process in snapshot["processNames"]:
        assert process["identityAndRoleVerified"] is False
        assert process["restartCountMeasured"] is None
        assert "cmdline" not in process and "pid" not in process


def test_owner_ticket_creation_revision_and_evidence_history(tmp_path):
    journal = tmp_path / "service-desk.sqlite"
    before = service_desk_snapshot385(journal, now_ms=NOW385, original_host=True)
    assert before["status"] == "PRIVATE_IT385_EMPTY_CREATE_ALLOWED"
    assert not journal.exists()

    created = make385(journal, app_id="yw")
    assert created["status"] == "open"
    tid = created["ticketId"]
    assert len(tid) == 32
    after = service_desk_snapshot385(journal, now_ms=NOW385 + 1000, original_host=True)
    assert after["ticketCount"] == 1
    assert after["slaCertifiedCount"] == 0
    assert after["providerComplaintResolutionVerified"] is False
    assert after["tickets"][0]["appId"] == "yw"
    assert after["tickets"][0]["events"][0]["authority"] == "OWNER_REPORT_ONLY"
    assert "tenant" not in str(after).lower()

    transition = transition_ticket385(
        journal,
        ticket_id=tid,
        expected_revision=1,
        status="investigating",
        evidence_kind="LOCAL_RUNTIME_SAMPLE_UNSIGNED",
        evidence_sha256="b" * 64,
        owner_user_id=123,
        now_ms=NOW385 + 1500,
        original_host=True,
    )
    assert transition["revision"] == 2
    with pytest.raises(ValueError, match="HOLD_STALE_REVISION"):
        transition_ticket385(
            journal,
            ticket_id=tid,
            expected_revision=1,
            status="resolved",
            evidence_kind="OWNER_REPORT_UNVERIFIED",
            evidence_sha256=None,
            owner_user_id=123,
            now_ms=NOW385 + 2000,
            original_host=True,
        )
    final = service_desk_snapshot385(journal, now_ms=NOW385 + 25 * 3600_000, original_host=True)
    ticket = final["tickets"][0]
    assert ticket["ownerTargetOverdue"] is True
    assert ticket["revision"] == 2
    assert len(ticket["events"]) == 2
    assert ticket["events"][0]["evidenceHashPresent"] is True
    assert "b" * 64 not in str(final)

    transition_ticket385(
        journal,
        ticket_id=tid,
        expected_revision=2,
        status="resolved",
        evidence_kind="OWNER_REPORT_UNVERIFIED",
        evidence_sha256=None,
        owner_user_id=123,
        now_ms=NOW385 + 26 * 3600_000,
        original_host=True,

    )
    closed = service_desk_snapshot385(journal, now_ms=NOW385 + 27 * 3600_000, original_host=True)
    assert closed["targetOverdueCount"] == 0
    assert closed["slaCertifiedCount"] == 0
    assert closed["tickets"][0]["closedAtMs"] is not None
    assert closed["tickets"][0]["status"] == "resolved"
    assert closed["tickets"][0]["slaVerified"] is False


def test_ticket_scope_isolation_and_tamper_detection(tmp_path):
    journal = tmp_path / "desk.sqlite"
    for bad in (
        "tenant_rosevear_landscaping",
        "unknown-client",
        "evil",
    ):
        with pytest.raises(ValueError, match="HOLD_IT385_INVALID"):
            make385(journal, app_id=bad)
    assert not journal.exists()
    with pytest.raises(ValueError, match="HOLD_NOT_ORIGINAL_WINDOWS_HOST"):
        create_ticket385(
            journal,
            app_id="rosevear-ai-hub",
            category="incident",
            summary_code="SUPPORT_REQUEST",
            target_hours=24,
            evidence_kind="OWNER_REPORT_UNVERIFIED",
            evidence_sha256=None,
            owner_user_id=123,
            now_ms=NOW385,
            original_host=False,
        )
    assert not journal.exists()
    created = make385(journal)
    with sqlite3.connect(journal) as db:
        db.execute(
            "UPDATE tickets385 SET app_id=? WHERE id=?",
            ("wrong-tenant", created["ticketId"]),
        )
    result = service_desk_snapshot385(journal, now_ms=NOW385, original_host=True)
    assert result["status"] == "HOLD_PRIVATE_TICKET_JOURNAL_INVALID_OR_MISSING"
    assert result["tickets"] == []


def test_owner_only_routes_never_execute_unauthenticated_post():
    with TestClient(app) as client:
        base = "/api/v1/system/it-ops-385"
        for path in ("/diagnostics", "/tickets"):
            assert client.get(base + path).status_code in (401, 403)
        assert client.post(
            base + "/tickets",
            json={
                "app_id": "rosevear-ai-hub",
                "category": "incident",
                "summary_code": "SUPPORT_REQUEST",
                "target_hours": 24,
            },
        ).status_code in (401, 403)
        assert client.post(
            base + "/tickets/" + "a" * 32 + "/transition",
            json={
                "expected_revision": 1,
                "status": "resolved",
            },
        ).status_code in (401, 403)
