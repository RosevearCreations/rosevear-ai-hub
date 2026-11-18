"""Build 363: independently pinned anchor, drill chronology and worker HOLD tests."""

import base64
import hashlib
from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell363 import local_custody363, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_custody363 import (
    ANCHOR_SCHEMA,
    original_host_correlation363,
    review363,
    verified_anchor363,
)
from rosevear_ai_hub.signed_intake362 import append_claim, canonical, empty_ledger

COMMIT = "a" * 40
NOW = datetime(2026, 11, 18, 16, 0, tzinfo=UTC)
NOW_MS = int(NOW.timestamp() * 1000)


def stamps(dt):
    return dt.isoformat().replace("+00:00", "Z")


def ledger_sample():
    ledger = empty_ledger(COMMIT)
    for scope, minute, signer in (
        ("reboot-before", -28, "1"),
        ("reboot-after", -8, "2"),
        ("guest", -6, "3"),
        ("ai-data-worker", -4, "4"),
    ):
        item = {
            "drillId": "drill_A_20261118",
            "eventId": "evidence_" + scope.replace("-", "_"),
            "scope": scope,
            "observedAt": stamps(NOW + timedelta(minutes=minute)),
            "sourceCommit": COMMIT,
            "signerKeyFingerprint": signer * 64,
            "nonce": signer * 32,
            "receiptSha256": signer * 64,
            "evidenceSha256": signer * 64,
            "signatureSha256": signer * 64,
        }
        ledger = append_claim(ledger, item)
    return ledger


def anchor_fixture(ledger):
    private = Ed25519PrivateKey.generate()
    public = private.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    raw = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    pin = hashlib.sha256(raw).hexdigest()
    payload = {
        "schema": ANCHOR_SCHEMA,
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "ledgerSha256": hashlib.sha256(canonical(ledger)).hexdigest(),
        "ledgerHeadSha256": ledger["events"][-1]["sha256"],
        "ledgerCount": len(ledger["events"]),
        "custodianRole": "independent-evidence-custodian",
        "custodianPin": pin,
        "nonce": "a" * 32,
        "issuedAt": stamps(NOW - timedelta(minutes=1)),
        "offHostCopyClaimed": True,
        "workerPilotAuthorized": False,
        "receiverActivationAuthorized": False,
        "physicalRuntimeIndependentlyVerified": False,
    }
    envelope = {
        "payload": payload,
        "signature": base64.b64encode(private.sign(canonical(payload))).decode(),
    }
    return envelope, public, pin


def telemetry():
    start = NOW - timedelta(minutes=15)
    return {
        "schema": "rosevear.hub.ql470.local-recovery-telemetry361.v1",
        "source": "UNSIGNED_LOCAL_INVENTORY_ONLY",
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "observedAtMs": NOW_MS - 1000,
        "lastWindowsBootUtc": stamps(start),
        "tasks": [
            {
                "name": name,
                "state": "DISABLED",
                "lastRunUtc": None,
                "lastResult": None,
                "exactTaskIdentityIndependentlyVerified": False,
            }
            for name in ("Rosevear AI Hub Unattended Boot", "Rosevear AI Hub Unattended Recovery")
        ],
        "masterServices": [
            {
                "name": name,
                "state": "NOT_INSTALLED",
                "startMode": "NOT_INSTALLED",
                "signedServiceEnrollmentVerified": False,
            }
            for name in ("Rosevear-AIHub", "Rosevear-AIDataPlatform", "Rosevear-CommsHub")
        ],
        "recentTaskSchedulerEventIds": [],
        "guestAuthenticatedContinuityVerified": False,
        "independentPreloginWitnessVerified": False,
        "physicalAutomaticStartupVerified": False,
        "masterWorkersSignedAckVerified": False,
        "commsPrivateReceiverAuthorized": False,
        "changesMade": False,
    }


def test_verified_custodian_signature_only_claims_offhost_durability():
    ledger = ledger_sample()
    anchor, pem, pin = anchor_fixture(ledger)
    verified = verified_anchor363(ledger, anchor, pem, pin, COMMIT, NOW)
    assert verified["signatureVerified"]
    assert verified["independentlyPinnedCustodianSigner"]
    assert not verified["offHostStorageIsIndependentlyProven"]
    assert verified["ledgerHeadSha256"] == ledger["events"][-1]["sha256"]


def test_tampered_ledger_signature_wrong_pin_and_stale_anchor_fail_closed():
    ledger = ledger_sample()
    anchor, pem, pin = anchor_fixture(ledger)
    with pytest.raises(ValueError, match="HOLD_QL472_INDEPENDENT_TRUST_PIN_REQUIRED"):
        verified_anchor363(ledger, anchor, pem, "0" * 64, COMMIT, NOW)
    changed = {
        "payload": {**anchor["payload"], "nonce": "c" * 32},
        "signature": anchor["signature"],
    }
    with pytest.raises(ValueError, match="HOLD_QL472_SIGNATURE_INVALID"):
        verified_anchor363(ledger, changed, pem, pin, COMMIT, NOW)
    changed = {"payload": {**anchor["payload"], "ledgerCount": 1}, "signature": anchor["signature"]}
    with pytest.raises(ValueError, match="HOLD_QL472_LEDGER_HASH_OR_COUNT_CHANGED"):
        verified_anchor363(ledger, changed, pem, pin, COMMIT, NOW)
    with pytest.raises(ValueError, match="HOLD_QL472_ANCHOR_STALE_OR_FUTURE"):
        verified_anchor363(ledger, anchor, pem, pin, COMMIT, NOW + timedelta(days=8))


def test_original_host_boot_correlates_only_unsigned_observation():
    ledger = ledger_sample()
    result = original_host_correlation363(ledger, telemetry(), COMMIT, NOW_MS, original_host=True)
    assert result["freshUnsignedWindowsSample"]
    assert result["pairedIndependentSignerClaims"]
    assert result["bootBoundaryChronologicallyCorrelated"]
    assert not result["physicalRebootIndependentlyProven"]
    assert not result["authenticatedGuestRuntimeIndependentlyProven"]
    remote = original_host_correlation363(ledger, telemetry(), COMMIT, NOW_MS, original_host=False)
    assert not remote["freshUnsignedWindowsSample"]
    stale = telemetry()
    stale["observedAtMs"] = NOW_MS - 120_001
    assert not original_host_correlation363(ledger, stale, COMMIT, NOW_MS, original_host=True)[
        "freshUnsignedWindowsSample"
    ]


def test_worker_review_never_permits_service_or_comms_receiver():
    ledger = ledger_sample()
    anchor, pem, pin = anchor_fixture(ledger)
    result = review363(
        ledger=ledger,
        anchor=anchor,
        public_pem=pem,
        pin=pin,
        expected_commit=COMMIT,
        telemetry=telemetry(),
        now_ms=NOW_MS,
        original_host=True,
    )
    assert result["independentCustodianSignatureVerified"]
    assert result["rebootCorrelation"]["bootBoundaryChronologicallyCorrelated"]
    assert not result["offHostStorageIndependentlyVerified"]
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["threeMasterWorkerProductionGreen"]
    assert not result["commsPrivateReceiverAuthorized"]
    assert result["workerReviews"][0]["fieldClaimCount"] == 1
    assert result["workerReviews"][1]["fieldClaimCount"] == 0
    assert all(not w["pilotInstallAuthorized"] for w in result["workerReviews"])
    assert result["workerReviews"][1]["escalation"] == "REVIEW_MISSING_SIGNED_WORKER_EVIDENCE"
    offhost = review363(
        ledger=ledger,
        anchor=anchor,
        public_pem=pem,
        pin=pin,
        expected_commit=COMMIT,
        telemetry=telemetry(),
        now_ms=NOW_MS,
        original_host=False,
    )
    assert not offhost["independentCustodianSignatureVerified"]
    assert offhost["anchorStatus"] == "HOLD_ORIGINAL_HOST_ONLY"


def test_owner_only_get_has_no_service_install_endpoints():
    client = TestClient(app)
    url = "/api/v1/system/server-shell-363"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    out = local_custody363(machine_name="OFFHOST", windows_host=False, now_ms=NOW_MS)
    assert out["anchorStatus"] == "HOLD_ORIGINAL_HOST_ONLY"
    assert not out["webMutationAvailable"]
