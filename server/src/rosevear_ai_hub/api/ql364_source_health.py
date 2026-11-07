"""QL-364 private, source-owned one-GET response adapter.

The Windows server never derives original-owner approval from a browser,
an integration-v1 HMAC credential, a file, or a public GitHub manifest.
Trusted callbacks must come from a separately provisioned original-host
operator; without them the endpoint remains DISCONNECTED / HOLD.
"""

import base64
import hashlib
import inspect
import json
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlsplit

from fastapi import Request
from fastapi.responses import JSONResponse

PATH = "/api/integration/v1/shell/health"
REQUEST_SCHEMA = "rosevear.hub.ql362.source-owner-one-get.v1"
HEALTH_SCHEMA = "rosevear.hub.ql362.source-health-receipt.v1"
ENVELOPE_SCHEMA = "rosevear.hub.ql363.source-health-envelope.v1"
RECEIPT_SCHEMA = "rosevear.hub.ql363.source-signed-health-receipt.v1"
SOURCE_ID = "rosevear-ai-hub"
REPOSITORY = "rosevear-ai-hub"
REQUEST_FIELDS = {
    "schema",
    "kind",
    "archiveId",
    "handoffSha256",
    "sourceId",
    "repository",
    "operationId",
    "sourceCommitSha",
    "manifestSha256",
    "sourceOrigin",
    "environment",
    "method",
    "path",
    "issuedAt",
    "expiresAt",
    "customerDataAllowed",
    "deviceActionsAllowed",
    "persistentConnectionAllowed",
}
SAFE_HEADERS = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Access-Control-Allow-Origin": "none",
}


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def digest(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def held(reason: str, status: int = 503) -> JSONResponse:
    return JSONResponse(
        {
            "schema": ENVELOPE_SCHEMA,
            "state": reason,
            "connectionState": "DISCONNECTED / HOLD",
            "connected": False,
            "authenticated": False,
            "customerDataAllowed": False,
            "customerCommunications": False,
            "deviceActions": False,
        },
        status_code=status,
        headers=SAFE_HEADERS,
    )


def timestamp(value: Any) -> int | None:
    if not isinstance(value, str) or not re.fullmatch(
        r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z", value
    ):
        return None
    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)
    except ValueError:
        return None


def valid_intent(v: Any, now: int) -> bool:
    if not isinstance(v, dict) or set(v) != REQUEST_FIELDS:
        return False
    start, end = timestamp(v.get("issuedAt")), timestamp(v.get("expiresAt"))
    origin = urlsplit(v.get("sourceOrigin", "")) if isinstance(v.get("sourceOrigin"), str) else None
    return (
        v.get("schema") == REQUEST_SCHEMA
        and v.get("kind") == "ONE_PRIVATE_HEALTH_GET_INTENT"
        and v.get("sourceId") == SOURCE_ID
        and v.get("repository") == REPOSITORY
        and v.get("environment") == "TEST"
        and v.get("method") == "GET"
        and v.get("path") == PATH
        and v.get("customerDataAllowed") is False
        and v.get("deviceActionsAllowed") is False
        and v.get("persistentConnectionAllowed") is False
        and re.fullmatch(r"[a-f0-9]{40}", v.get("sourceCommitSha", "")) is not None
        and re.fullmatch(r"[a-f0-9]{64}", v.get("handoffSha256", "")) is not None
        and re.fullmatch(r"[a-f0-9]{64}", v.get("manifestSha256", "")) is not None
        and re.fullmatch(
            r"[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}",
            v.get("operationId", ""),
        )
        is not None
        and isinstance(v.get("archiveId"), str)
        and 0 < len(v["archiveId"]) < 160
        and origin is not None
        and origin.scheme == "https"
        and bool(origin.netloc)
        and not origin.path
        and not origin.query
        and not origin.fragment
        and start is not None
        and end is not None
        and start <= now + 5000
        and end > now
        and end - start <= 90000
    )


async def _call(callback: Any, **kwargs: Any) -> Any:
    result = callback(**kwargs)
    return await result if inspect.isawaitable(result) else result


async def source_health(
    request: Request,
    *,
    approve_original_get=None,
    claim_operation=None,
    sign_source_receipt=None,
    now_ms: int | None = None,
) -> JSONResponse:
    now = now_ms if now_ms is not None else int(datetime.now(UTC).timestamp() * 1000)
    if request.method != "GET":
        return held("DENY_METHOD", 405)
    if request.url.path != PATH or request.url.query:
        return held("DENY_EXACT_READONLY_SCOPE", 403)
    if any(
        key in request.headers
        for key in ("x-child-id", "x-rosevear-business", "x-rosevear-tenant", "x-rosevear-child")
    ):
        return held("DENY_CHILD_IDENTITY_AS_SHELL", 403)
    if not all(callable(fn) for fn in (approve_original_get, claim_operation, sign_source_receipt)):
        return held("HOLD_ORIGINAL_OWNERS_SIGNER_AND_DURABLE_NONCE_UNAVAILABLE")
    encoded = request.headers.get("x-rosevear-ql362-request", "")
    if not 0 < len(encoded) <= 4096 or re.fullmatch(r"[A-Za-z0-9_-]+", encoded) is None:
        return held("DENY_SIGNED_TEST_REQUEST_MISSING", 403)
    try:
        intent = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if not valid_intent(intent, now):
            return held("DENY_QL362_SCOPE_OR_EXPIRY", 403)
        request_sha = digest(intent)
        op = intent["operationId"]
        approved = await _call(
            approve_original_get,
            source_id=SOURCE_ID,
            operation_id=op,
            request_sha256=request_sha,
            intent=intent,
        )
        if not isinstance(approved, dict) or any(
            (
                approved.get("state")
                != "INDEPENDENT_ORIGINAL_SOURCE_AND_MASTER_OWNER_TEST_AUTHORIZED",
                approved.get("sourceId") != SOURCE_ID,
                approved.get("operationId") != op,
                approved.get("requestSha256") != request_sha,
                approved.get("revoked") is not False,
                approved.get("originalIssuerVerified") is not True,
                approved.get("sourceOwnerVerified") is not True,
                approved.get("masterOwnerVerified") is not True,
                approved.get("originalSignerCustodyVerified") is not True,
                approved.get("sourceCommitSha") != intent["sourceCommitSha"],
                approved.get("manifestSha256") != intent["manifestSha256"],
                approved.get("sourceOrigin") != intent["sourceOrigin"],
                re.fullmatch(r"[a-f0-9]{64}", approved.get("sourceSignerSpkiSha256", "")) is None,
            )
        ):
            return held("HOLD_INDEPENDENT_ORIGINAL_AUTHORIZATION_MISSING", 403)
        if (
            await _call(
                claim_operation,
                source_id=SOURCE_ID,
                operation_id=op,
                request_sha256=request_sha,
                expires_at=intent["expiresAt"],
            )
            is not True
        ):
            return held("DENY_NONCE_REPLAY_OR_DURABLE_STORAGE_UNAVAILABLE", 409)
        expiry_ms = min(timestamp(intent["expiresAt"]), now + 90000)
        issued = (
            datetime.fromtimestamp(now / 1000, UTC)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z")
        )
        expiry = (
            datetime.fromtimestamp(expiry_ms / 1000, UTC)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z")
        )
        health = {
            "schema": HEALTH_SCHEMA,
            "sourceId": SOURCE_ID,
            "operationId": op,
            "health": "ok",
            "connected": False,
            "customerDataAllowed": False,
            "deviceActions": False,
        }
        receipt = {
            "schema": RECEIPT_SCHEMA,
            "sourceId": SOURCE_ID,
            "operationId": op,
            "requestSha256": request_sha,
            "receiptSha256": digest(health),
            "sourceCommitSha": intent["sourceCommitSha"],
            "sourceOrigin": intent["sourceOrigin"],
            "environment": "TEST",
            "method": "GET",
            "path": PATH,
            "scope": "HEALTH_METADATA_ONLY_NO_CUSTOMERS_OR_DEVICES",
            "issuedAt": issued,
            "expiresAt": expiry,
        }
        signed = await _call(
            sign_source_receipt,
            payload=canonical(receipt),
            source_id=SOURCE_ID,
            operation_id=op,
            request_sha256=request_sha,
        )
        if (
            not isinstance(signed, dict)
            or signed.get("attested") is not True
            or (signed.get("spkiSha256") != approved["sourceSignerSpkiSha256"])
            or re.fullmatch(r"[A-Za-z0-9_-]{86}", signed.get("signature", "")) is None
            or (re.fullmatch(r"[A-Za-z0-9_-]{12,100}", signed.get("keyId", "")) is None)
        ):
            return held("HOLD_ORIGINAL_SOURCE_SIGNER_UNATTESTED")
        envelope = {
            "schema": ENVELOPE_SCHEMA,
            "health": health,
            "receipt": {
                "schema": RECEIPT_SCHEMA,
                "payload": receipt,
                "signature": signed["signature"],
                "keyId": signed["keyId"],
            },
        }
        if len(canonical(envelope)) > 4096:
            return held("DENY_OVERSIZED_HEALTH_RESPONSE")
        return JSONResponse(envelope, headers=SAFE_HEADERS)
    except Exception:
        # Private signer, pin validation or durable claim failures fail closed.
        return held("HOLD_PRIVATE_AUTHORITY_OR_RECEIPT_UNAVAILABLE")
