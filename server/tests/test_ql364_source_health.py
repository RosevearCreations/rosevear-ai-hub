"""QL-364 original-host contract compatibility: no live-owner proof is implied."""

import base64
import hashlib
import json
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from rosevear_ai_hub.api.ql364_source_health import (
    PATH,
    RECEIPT_SCHEMA,
    REQUEST_SCHEMA,
    SOURCE_ID,
    canonical,
    digest,
    source_health,
)
from rosevear_ai_hub.main import app


def test_original_windows_source_health_stays_disconnected_without_enrollment():
    client = TestClient(app)
    response = client.get(PATH)
    assert response.status_code == 503
    assert response.json()["connectionState"] == "DISCONNECTED / HOLD"
    assert response.json()["connected"] is False
    assert response.headers["cache-control"] == "private, no-store"
    assert client.post(PATH).status_code == 405
    assert client.get(PATH, params={"devices": "yes"}).status_code == 403


def test_synthetic_original_approval_signer_claim_and_replay_contract():
    import asyncio

    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from starlette.requests import Request

    now = 1794052800000
    original = Ed25519PrivateKey.generate()
    pub = original.public_key().public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    spki_sha = hashlib.sha256(pub).hexdigest()
    issued = datetime.fromtimestamp((now - 1000) / 1000, UTC)
    expiry = issued + timedelta(seconds=30)
    intent = {
        "schema": REQUEST_SCHEMA,
        "kind": "ONE_PRIVATE_HEALTH_GET_INTENT",
        "archiveId": "synthetic-offline-fixture",
        "handoffSha256": "a" * 64,
        "sourceId": SOURCE_ID,
        "repository": "rosevear-ai-hub",
        "operationId": "12345678-1234-4123-8123-123456789012",
        "sourceCommitSha": "b" * 40,
        "manifestSha256": "c" * 64,
        "sourceOrigin": "https://original.example",
        "environment": "TEST",
        "method": "GET",
        "path": PATH,
        "customerDataAllowed": False,
        "deviceActionsAllowed": False,
        "persistentConnectionAllowed": False,
        "issuedAt": issued.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "expiresAt": expiry.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    }
    encoded = base64.urlsafe_b64encode(json.dumps(intent).encode()).decode().rstrip("=")
    scope = {
        "type": "http",
        "method": "GET",
        "path": PATH,
        "scheme": "https",
        "server": ("original.example", 443),
        "headers": [(b"x-rosevear-ql362-request", encoded.encode())],
        "query_string": b"",
    }
    request = Request(scope)
    seen = set()

    async def approve_original_get(source_id, operation_id, request_sha256, intent):
        return {
            "state": "INDEPENDENT_ORIGINAL_SOURCE_AND_MASTER_OWNER_TEST_AUTHORIZED",
            "sourceId": source_id,
            "operationId": operation_id,
            "requestSha256": request_sha256,
            "revoked": False,
            "originalIssuerVerified": True,
            "sourceOwnerVerified": True,
            "masterOwnerVerified": True,
            "originalSignerCustodyVerified": True,
            "sourceCommitSha": intent["sourceCommitSha"],
            "manifestSha256": intent["manifestSha256"],
            "sourceOrigin": intent["sourceOrigin"],
            "sourceSignerSpkiSha256": spki_sha,
        }

    def claim_operation(source_id, operation_id, request_sha256, expires_at):
        if operation_id in seen:
            return False
        seen.add(operation_id)
        return True

    def sign_source_receipt(payload, **_kwargs):
        return {
            "attested": True,
            "spkiSha256": spki_sha,
            "keyId": "synthetic-only-k01",
            "signature": base64.urlsafe_b64encode(original.sign(payload)).decode().rstrip("="),
        }

    async def execute():
        return await source_health(
            request,
            approve_original_get=approve_original_get,
            claim_operation=claim_operation,
            sign_source_receipt=sign_source_receipt,
            now_ms=now,
        )

    response = asyncio.run(execute())
    assert response.status_code == 200
    payload = json.loads(response.body)
    assert payload["health"]["connected"] is False
    assert payload["health"]["deviceActions"] is False
    assert payload["receipt"]["payload"]["receiptSha256"] == digest(payload["health"])
    assert payload["receipt"]["payload"]["schema"] == RECEIPT_SCHEMA
    original.public_key().verify(
        base64.urlsafe_b64decode(payload["receipt"]["signature"] + "=="),
        canonical(payload["receipt"]["payload"]),
    )
    assert asyncio.run(execute()).status_code == 409
