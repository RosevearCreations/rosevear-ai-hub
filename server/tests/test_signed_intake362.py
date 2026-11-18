"""QL-471: genuine cryptographic fixture tests; NEVER physical host acceptance."""

import base64
import hashlib
import importlib.util
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell362 import local_history362, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.signed_intake362 import (
    CHECKS,
    CLAIM_SCHEMA,
    append_claim,
    canonical,
    dashboard,
    empty_ledger,
    validate_pins,
    verify_claim,
    verify_ledger,
)

COMMIT = "a" * 40
DRILL = "drill_20261118_A"
SCOPES = tuple(CHECKS)


def fixture(scope="guest", *, observed_offset=3):
    now = datetime.now(UTC).replace(microsecond=0)
    keys = {name: Ed25519PrivateKey.generate() for name in SCOPES}
    pins = {
        name: hashlib.sha256(
            k.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
        ).hexdigest()
        for name, k in keys.items()
    }
    observed = now - timedelta(minutes=observed_offset)
    evidence = b"SYNTHETIC_ONLY_NOT_A_PHYSICAL_FIELD_TEST"
    payload = {
        "schema": CLAIM_SCHEMA,
        "scope": scope,
        "host": "DESKTOP-AE894KC",
        "sourceCommit": COMMIT,
        "drillId": DRILL,
        "eventId": "event_" + scope.replace("-", "_") + "_01",
        "nonce": "f" * 32,
        "observedAt": observed.isoformat().replace("+00:00", "Z"),
        "issuedAt": now.isoformat().replace("+00:00", "Z"),
        "evidenceSha256": hashlib.sha256(evidence).hexdigest(),
        "signerKeyFingerprint": pins[scope],
        "checks": dict.fromkeys(CHECKS[scope], True),
    }
    key = keys[scope]
    pub = key.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo)
    sig = base64.b64encode(key.sign(canonical(payload)))
    return payload, sig, evidence, pub, pins, now


def accepted(fix, *, payload=None):
    claim, sig, evidence, pub, pins, now = fix
    return verify_claim(
        json.dumps(payload if payload is not None else claim).encode(),
        sig,
        evidence,
        pub,
        pins,
        COMMIT,
        now=now,
    )


@pytest.mark.parametrize("scope", SCOPES)
def test_independently_pinned_signature_proves_only_field_claim(scope):
    item = accepted(fixture(scope))
    assert item["scope"] == scope
    result = dashboard(append_claim(empty_ledger(COMMIT), item), COMMIT)
    assert result["historyCount"] == 1
    assert not result["signaturesReverifiedAtRead"]
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["threeMasterWorkerProductionGreen"]
    assert not result["commsPrivateReceiverAuthorized"]
    assert not result["pilotInstallAuthorized"]


def test_tampering_and_missing_check_is_hold():
    fix = fixture("comms-worker")
    claim, sig, evidence, pub, pins, now = fix
    changed = {**claim, "checks": {**claim["checks"], "privateQl340cReceiverOffClaimed": False}}
    with pytest.raises(ValueError, match="HOLD_QL471_FAILED_CHECK"):
        accepted(fix, payload=changed)
    changed["checks"]["privateQl340cReceiverOffClaimed"] = True
    changed["nonce"] = "e" * 32
    with pytest.raises(ValueError, match="HOLD_QL471_SIGNATURE_INVALID"):
        accepted(fix, payload=changed)
    with pytest.raises(ValueError, match="HOLD_QL471_EVIDENCE_TAMPERED"):
        verify_claim(
            json.dumps(claim).encode(),
            sig,
            evidence + b"TAMPER",
            pub,
            pins,
            COMMIT,
            now=now,
        )


def test_untrusted_signer_wrong_source_old_event_and_same_keys_hold():
    fix = fixture("guest")
    claim, sig, evidence, pub, pins, now = fix
    with pytest.raises(ValueError, match="HOLD_QL471_SOURCE_HOST_SCOPE"):
        verify_claim(
            json.dumps(claim).encode(),
            sig,
            evidence,
            pub,
            pins,
            "b" * 40,
            now=now,
        )
    with pytest.raises(ValueError, match="HOLD_QL471_STALE_OR_FUTURE_CLAIM"):
        verify_claim(
            json.dumps(claim).encode(),
            sig,
            evidence,
            pub,
            pins,
            COMMIT,
            now=now + timedelta(hours=25),
        )
    other = {**pins, "comms-worker": pins["guest"]}
    with pytest.raises(ValueError, match="HOLD_QL471_INDEPENDENT_SIGNERS_REQUIRED"):
        validate_pins(other)
    wrong = {**pins, "guest": "c" * 64}
    with pytest.raises(ValueError, match="HOLD_QL471_PIN_NOT_TRUSTED"):
        verify_claim(
            json.dumps(claim).encode(),
            sig,
            evidence,
            pub,
            wrong,
            COMMIT,
            now=now,
        )


def test_ledger_detects_replay_and_tampered_hash_chain():
    item = accepted(fixture())
    ledger = append_claim(empty_ledger(COMMIT), item)
    with pytest.raises(ValueError, match="HOLD_QL471_REPLAY_DUPLICATE"):
        append_claim(ledger, item)
    tampered = json.loads(json.dumps(ledger))
    tampered["events"][0]["scope"] = "comms-worker"
    with pytest.raises(ValueError, match="HOLD_QL471_LEDGER_CHAIN_BROKEN"):
        verify_ledger(tampered, COMMIT)
    with pytest.raises(ValueError, match="HOLD_QL471_LEDGER_SCHEMA_SOURCE"):
        verify_ledger(ledger, "b" * 40)


def test_distinct_reboot_signers_make_only_historical_paired_claim():
    before = accepted(fixture("reboot-before", observed_offset=12))
    after = accepted(fixture("reboot-after", observed_offset=2))
    ledger = append_claim(empty_ledger(COMMIT), before)
    ledger = append_claim(ledger, after)
    report = dashboard(ledger, COMMIT)
    assert report["drills"][0]["pairedClaimTimeline"] is True
    assert report["drills"][0]["physicalRecoveryIndependentlyVerified"] is False
    assert not report["physicalUnattendedProductionGreen"]
    assert len(report["drills"][0]["scopes"]) == 2


def test_cli_dry_run_and_private_append_replay_protection(tmp_path):
    path = Path(__file__).resolve().parents[2] / "scripts/intake-signed-field-evidence362.py"
    spec = importlib.util.spec_from_file_location("ql471_cli362", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    payload, sig, evidence, pub, pins, _now = fixture("guest")
    folder = tmp_path / "packet"
    folder.mkdir()
    (folder / "receipt.json").write_text(json.dumps(payload), encoding="utf-8")
    (folder / "signature.b64").write_bytes(sig)
    (folder / "evidence.bin").write_bytes(evidence)
    (folder / "signer.pub.pem").write_bytes(pub)
    pinfile = tmp_path / "pins.json"
    pinfile.write_text(json.dumps(pins), encoding="utf-8")
    ledger = tmp_path / "ledger.json"
    dry = module.evaluate(folder, pinfile, COMMIT, ledger, append=False)
    assert dry["writePerformed"] is False
    assert not ledger.exists()
    written = module.evaluate(folder, pinfile, COMMIT, ledger, append=True)
    assert written["writePerformed"] is True
    assert written["historyCount"] == 1
    assert ledger.is_file()
    with pytest.raises(ValueError, match="HOLD_QL471_REPLAY_DUPLICATE"):
        module.evaluate(folder, pinfile, COMMIT, ledger, append=True)
    assert len(json.loads(ledger.read_text(encoding="utf-8"))["events"]) == 1


def test_missing_or_offhost_owner_route_is_hold():
    client = TestClient(app)
    url = "/api/v1/system/server-shell-362"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(url).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(url).status_code in (401, 403, 405)
    result = local_history362(machine_name="NOT_THE_ORIGINAL_HOST", windows_host=False)
    assert result["ledgerIntegrity"] == "HOLD_UNAVAILABLE"
    assert not result["physicalUnattendedProductionGreen"]
    assert not result["pilotInstallAuthorized"]
