"""QL-461: owner-signed, original-host-only three-Master event key registry."""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell349 import MASTER_MODULES, ORIGINAL_HOST
from rosevear_ai_hub.service_identity347 import (
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
    _sha,
)

REGISTRY_SCHEMA352 = "rosevear.hub.signed-master-registry352.v1"


def load_master_registry352(
    *, path: Path | None, owner_public: bytes | None, owner_pin: str | None,
    enrollment: dict[str, Any], now_ms: int, machine_name: str,
) -> Registry347 | None:
    """No accepting remote self-asserted keys and no private signing keys in registry."""
    if not (
        type(path) is Path and path.is_file() and not path.is_symlink()
        and path.stat().st_size <= 32_768
        and type(owner_public) is bytes and len(owner_public) == 32
        and _sha(owner_pin)
        and hashlib.sha256(owner_public).hexdigest() == owner_pin
        and enrollment.get("accepted") is True
        and type(machine_name) is str and machine_name.upper() == ORIGINAL_HOST
        and type(now_ms) is int
    ):
        return None
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
        if not (
            type(config) is dict
            and set(config) == {"payload", "signature"}
            and type(config["payload"]) is dict
            and type(config["signature"]) is str and len(config["signature"]) == 128
        ):
            return None
        p = config["payload"]
        if not (
            set(p) == {
                "schema", "originalHost", "manifestDigest",
                "issuedAtMs", "expiresAtMs", "keys",
            }
            and p["schema"] == REGISTRY_SCHEMA352
            and p["originalHost"] == ORIGINAL_HOST
            and p["manifestDigest"] == _digest(enrollment["payload"])
            and type(p["issuedAtMs"]) is int and type(p["expiresAtMs"]) is int
            and 0 <= now_ms - p["issuedAtMs"] <= 30 * 86_400_000
            and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + 30 * 86_400_000
            and now_ms < p["expiresAtMs"]
            and type(p["keys"]) is list and 1 <= len(p["keys"]) <= 6
        ):
            return None
        Ed25519PublicKey.from_public_bytes(owner_public).verify(
            bytes.fromhex(config["signature"]), _canonical(p),
        )
        allowed = {"rosevear-ai-hub"} | {
            peer["id"] for peer in enrollment["payload"]["peers"]
            if peer["id"] in MASTER_MODULES
        }
        result = []
        for key in p["keys"]:
            if not (
                type(key) is dict
                and set(key) == {
                    "issuer", "keyId", "publicDerBase64", "activeFromMs",
                    "activeUntilMs", "revokedAtMs",
                }
                and type(key["issuer"]) is str and key["issuer"] in allowed
                and type(key["keyId"]) is str and len(key["keyId"]) >= 12
                and type(key["publicDerBase64"]) is str
            ):
                return None
            data = base64.b64decode(key["publicDerBase64"], validate=True)
            result.append(PublicKey347(
                issuer=key["issuer"], key_id=key["keyId"],
                public_der=data, pin_sha256=hashlib.sha256(data).hexdigest(),
                active_from_ms=key["activeFromMs"],
                active_until_ms=key["activeUntilMs"],
                revoked_at_ms=key["revokedAtMs"],
            ))
        registry = Registry347(tuple(result))
        if not any(x.issuer == "rosevear-ai-hub" for x in registry.records):
            return None
        return registry
    except (
        ValueError, TypeError, KeyError, AttributeError, InvalidSignature,
        OSError, UnicodeError, OverflowError, binascii.Error,
    ):
        return None
