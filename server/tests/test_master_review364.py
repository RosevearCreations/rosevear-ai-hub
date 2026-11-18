"""Build 364 QL-473: offline cryptographic readback and peer-claim regressions."""

import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell364 import local_review364, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_custody363 import ANCHOR_SCHEMA
from rosevear_ai_hub.master_review364 import (
    PILOT_SCHEMA,
    READBACK_SCHEMA,
    SERVICES,
    review364,
    verify_readback364,
    verify_three_master364,
)
from rosevear_ai_hub.signed_intake362 import append_claim, canonical, empty_ledger

COMMIT = "a" * 40
NOW = datetime(2026, 11, 18, 19, 0, tzinfo=UTC)
NOW_MS = int(NOW.timestamp() * 1000)


def stamp(moment):
    return moment.isoformat().replace("+00:00", "Z")


def identity():
    secret = Ed25519PrivateKey.generate()
    public = secret.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    pin = hashlib.sha256(
        secret.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    ).hexdigest()
    return secret, public, pin


def signed(secret, payload):
    return base64.b64encode(secret.sign(canonical(payload))).decode()


def sample():
    ledger = empty_ledger(COMMIT)
    for i, scope in enumerate(("reboot-before", "reboot-after", "guest"), 1):
        ledger = append_claim(
            ledger,
            {
                "drillId": "ql473_test_20261118",
                "eventId": "ql473_event_" + str(i),
                "scope": scope,
                "observedAt": stamp(NOW - timedelta(minutes=40 - i)),
                "sourceCommit": COMMIT,
                "signerKeyFingerprint": str(i) * 64,
                "nonce": str(i) * 32,
                "receiptSha256": str(i) * 64,
                "evidenceSha256": str(i) * 64,
                "signatureSha256": str(i) * 64,
            },
        )
    anchor_key, anchor_pub, anchor_pin = identity()
    ap = {
        "schema": ANCHOR_SCHEMA,
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "ledgerSha256": hashlib.sha256(canonical(ledger)).hexdigest(),
        "ledgerHeadSha256": ledger["events"][-1]["sha256"],
        "ledgerCount": len(ledger["events"]),
        "custodianRole": "independent-evidence-custodian",
        "custodianPin": anchor_pin,
        "nonce": "a" * 32,
        "issuedAt": stamp(NOW - timedelta(minutes=30)),
        "offHostCopyClaimed": True,
        "workerPilotAuthorized": False,
        "receiverActivationAuthorized": False,
        "physicalRuntimeIndependentlyVerified": False,
    }
    anchor = {"payload": ap, "signature": signed(anchor_key, ap)}
    readback_key, readback_pub, readback_pin = identity()
    rp = {
        "schema": READBACK_SCHEMA,
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "ledgerSha256": hashlib.sha256(canonical(ledger)).hexdigest(),
        "anchorPayloadSha256": hashlib.sha256(canonical(ap)).hexdigest(),
        "ledgerHeadSha256": ledger["events"][-1]["sha256"],
        "ledgerCount": len(ledger["events"]),
        "readbackId": "readback_ql473_001",
        "readbackAt": stamp(NOW - timedelta(minutes=20)),
        "independentKeyFingerprint": readback_pin,
        "offHostStorageReadbackClaimed": True,
        "workerPilotAuthorized": False,
        "receiverActivationAuthorized": False,
    }
    readback = {"payload": rp, "signature": signed(readback_key, rp)}
    peers = {service: identity() for service in SERVICES}
    pp = {
        "schema": PILOT_SCHEMA,
        "originalHost": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "challenge": "f" * 32,
        "drillId": "ql473_test_20261118",
        "observedAt": stamp(NOW - timedelta(minutes=4)),
        "issuedAt": stamp(NOW - timedelta(minutes=1)),
        "peerVersions": dict.fromkeys(SERVICES, "1.1.0"),
        "claimedBoundedMtls": True,
        "claimedSignedPeerAcks": True,
        "claimedRollbackReady": True,
        "performedOnOriginalHostClaimed": True,
        "automaticStartupAuthorized": False,
        "ql340cReceiverAuthorized": False,
    }
    pilot = {
        "payload": pp,
        "signatures": {name: signed(keys[0], pp) for name, keys in peers.items()},
    }
    return {
        "ledger": ledger,
        "copy": json.loads(json.dumps(ledger)),
        "anchor": anchor,
        "anchor_key": anchor_pub,
        "anchor_pin": anchor_pin,
        "readback": readback,
        "readback_key": readback_pub,
        "readback_pin": readback_pin,
        "pilot": pilot,
        "peer_keys": {name: key[1] for name, key in peers.items()},
        "peer_pins": {name: key[2] for name, key in peers.items()},
        "expected_commit": COMMIT,
        "now_ms": NOW_MS,
        "original_host": True,
    }


def readback(data):
    return verify_readback364(
        data["ledger"],
        data["copy"],
        data["anchor"],
        data["readback"],
        data["readback_key"],
        data["readback_pin"],
        COMMIT,
        NOW,
    )


def pilot(data):
    return verify_three_master364(
        data["pilot"],
        data["peer_keys"],
        data["peer_pins"],
        COMMIT,
        NOW,
        {
            data["anchor_pin"],
            data["readback_pin"],
            *(e["signerKeyFingerprint"] for e in data["ledger"]["events"]),
        },
    )


def test_readback_compares_real_copy_and_distinct_pinned_signature():
    data = sample()
    evidence = readback(data)
    assert evidence["signedReadbackClaimVerified"]
    assert evidence["copiedLedgerByteEquivalent"]
    assert not evidence["offHostStorageIndependentlyProven"]


def test_readback_rejects_changed_copy_forged_signature_and_same_key():
    data = sample()
    copy = json.loads(json.dumps(data["copy"]))
    copy["events"][0]["scope"] = "comms-worker"
    data["copy"] = copy
    with pytest.raises(ValueError, match="HOLD_QL471_LEDGER_CHAIN_BROKEN"):
        readback(data)
    data = sample()
    data["readback"]["payload"]["ledgerCount"] = 1
    with pytest.raises(ValueError, match="HOLD_QL473_READBACK_DIGEST_MISMATCH"):
        readback(data)
    data = sample()
    data["readback"]["payload"]["readbackId"] = "readback_ql473_777"
    with pytest.raises(ValueError, match="HOLD_QL473_INVALID_SIGNATURE"):
        readback(data)
    data = sample()
    data["readback_pin"] = data["anchor_pin"]
    with pytest.raises(ValueError, match="HOLD_QL473_READBACK_INDEPENDENCE_OR_AUTHORITY"):
        readback(data)


def test_three_real_signatures_are_checked_but_not_treated_as_live_connection():
    data = sample()
    checked = pilot(data)
    assert checked["threeDistinctPeerSignaturesVerified"]
    assert not checked["liveMtlsIndependentlyObserved"]
    assert not checked["realSignedPeerAckIndependentlyProven"]
    assert not checked["workerInstallationAuthorized"]


def test_bad_peer_pins_replay_claims_expiry_and_authority_are_hold():
    data = sample()
    data["peer_pins"]["Rosevear-CommsHub"] = data["peer_pins"]["Rosevear-AIDataPlatform"]
    with pytest.raises(ValueError, match="HOLD_QL473_INDEPENDENT_PEER_KEYS_REQUIRED"):
        pilot(data)
    data = sample()
    data["pilot"]["payload"]["ql340cReceiverAuthorized"] = True
    with pytest.raises(ValueError, match="HOLD_QL473_PILOT_SCOPE_OR_AUTHORITY"):
        pilot(data)
    data = sample()
    data["pilot"]["payload"]["challenge"] = "e" * 32
    with pytest.raises(ValueError, match="HOLD_QL473_INVALID_SIGNATURE"):
        pilot(data)
    data = sample()
    with pytest.raises(ValueError, match="HOLD_QL473_PILOT_TIME_WINDOW"):
        verify_three_master364(
            data["pilot"],
            data["peer_keys"],
            data["peer_pins"],
            COMMIT,
            NOW + timedelta(hours=1),
            set(),
        )


def test_cross_module_review_is_permanently_non_activating():
    result = review364(**sample())
    assert result["independentReadbackClaimVerified"]
    assert result["copiedLedgerContentMatched"]
    assert result["distinctThreeMasterSignedClaimsVerified"]
    assert result["sourceFeatureCoverageEstimate"] == 73
    assert result["featureCoverageBaseline"] == 68
    assert result["estimatedSourceFeatureGainPoints"] == 5
    assert result["fieldAcceptanceEstimate"] == 25
    assert not result["liveThreeMasterPilotIndependentlyVerified"]
    assert not result["offHostStorageIndependentlyProven"]
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["threeMasterWorkerProductionGreen"]
    assert not result["commsPrivateReceiverAuthorized"]
    assert all(not item["liveConnectedVerified"] for item in result["workerReviews"])


def test_missing_replay_proof_and_offhost_fail_closed():
    data = sample()
    data["pilot"] = None
    result = review364(**data)
    assert result["independentReadbackClaimVerified"]
    assert not result["distinctThreeMasterSignedClaimsVerified"]
    data = sample()
    data["original_host"] = False
    result = review364(**data)
    assert not result["independentReadbackClaimVerified"]
    assert result["anchorStatus"] == "HOLD_NOT_ORIGINAL_WINDOWS_HOST"


def test_owner_only_get_does_not_expose_mutating_controls():
    client = TestClient(app)
    url = "/api/v1/system/server-shell-364"
    assert all(item.methods == {"GET"} for item in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    response = local_review364(machine_name="OTHER_PC", windows_host=False, now_ms=NOW_MS)
    assert response["anchorStatus"] == "HOLD_NOT_ORIGINAL_WINDOWS_HOST"
    assert not response["webMutationAvailable"]
