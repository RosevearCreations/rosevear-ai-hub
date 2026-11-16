"""Build 349: signed original-host intent, fail-closed status and no live claims."""

import hashlib
import json
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell349 import router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_shell349 import (
    MASTER_MODULES,
    ORIGINAL_HOST,
    SCHEMA349,
    capability_snapshot349,
    load_local_manifest349,
    verify_manifest349,
)
from rosevear_ai_hub.service_identity347 import _canonical


def _signed(now_ms: int):
    key = Ed25519PrivateKey.generate()
    public = key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    payload = {
        "schema": SCHEMA349,
        "originalHost": ORIGINAL_HOST,
        "issuedAtMs": now_ms - 1_000,
        "expiresAtMs": now_ms + 10_000,
        "modules": [
            {"id": n, "desiredEnabled": n == "rosevear-ai-hub", "theme": "nebula"}
            for n in MASTER_MODULES
        ],
        "peers": [
            {
                "id": "YW",
                "hostname": "yw.example.test",
                "port": 443,
                "tlsLeafPin": "a" * 64,
                "protocols": ["1.1"],
                "capabilities": ["governance.readonly"],
            }
        ],
    }
    manifest = {"payload": payload, "signature": key.sign(_canonical(payload)).hex()}
    return manifest, public, hashlib.sha256(public).hexdigest()


def test_no_manifest_is_hold():
    result = load_local_manifest349(None, None, None, 1700000000000)
    assert result["accepted"] is False
    status = capability_snapshot349(result)
    assert status["serverShell"] == "ai-data-platform"
    assert status["crossAppConnectivityVerified"] is False
    assert status["physicalReceiverCurrentlyOff"] is False
    assert status["modules"][0]["desiredEnabled"] is None
    assert status["applications"][0]["connectivity"] == "UNVERIFIED"


def test_valid_signed_local_intent_never_becomes_live(tmp_path: Path):
    now = 1700000000000
    manifest, pub, pin = _signed(now)
    file = tmp_path / "manifest.json"
    key = tmp_path / "owner.raw"
    file.write_text(json.dumps(manifest), encoding="utf-8")
    key.write_bytes(pub)
    parsed = load_local_manifest349(file, key, pin, now, ORIGINAL_HOST)
    assert parsed["accepted"] is True
    status = capability_snapshot349(parsed)
    assert status["verifiedLocalOwnerManifest"] is True
    assert status["modules"][1]["desiredEnabled"] is True
    assert status["applications"][1]["signedPeerIntentPresent"] is True
    assert status["applications"][1]["connectivity"] == "UNVERIFIED"
    assert status["messageDelivered"] is False
    assert status["configurationTogglesAreNotServiceControl"] is True


def test_signature_tamper_wrong_host_expiry_and_untrusted_key_denied():
    now = 1700000000000
    manifest, pub, pin = _signed(now)
    assert not verify_manifest349(manifest, pub, pin, now, "OTHER-HOST")["accepted"]
    assert not verify_manifest349(manifest, pub, "0" * 64, now, ORIGINAL_HOST)["accepted"]
    assert not verify_manifest349(manifest, pub, pin, now + 20_000, ORIGINAL_HOST)["accepted"]
    manifest["payload"]["modules"][0]["desiredEnabled"] = True
    assert not verify_manifest349(manifest, pub, pin, now, ORIGINAL_HOST)["accepted"]


def test_invalid_peer_scope_is_denied_even_with_valid_signature():
    now = 1700000000000
    manifest, _, _ = _signed(now)
    private = Ed25519PrivateKey.generate()
    trusted = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    trusted_pin = hashlib.sha256(trusted).hexdigest()
    manifest["payload"]["peers"][0]["capabilities"] = ["receiver.original_host.activate"]
    manifest["signature"] = private.sign(_canonical(manifest["payload"])).hex()
    assert not verify_manifest349(manifest, trusted, trusted_pin, now, ORIGINAL_HOST)["accepted"]


def test_no_remote_enrollment_or_anonymous_api():
    client = TestClient(app)
    path = "/api/v1/system/server-shell-349"
    assert all(item.methods == {"GET"} for item in router.routes)
    assert client.get(path).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(path).status_code in (401, 403, 405)
