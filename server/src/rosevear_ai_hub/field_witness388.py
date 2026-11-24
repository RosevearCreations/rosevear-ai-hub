"""Build 388: bounded offline verification of paired field witness candidates.

No signed claim alone certifies physical evidence, replay protection or recovery.
"""

from __future__ import annotations

import json
import re
from typing import Literal

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from pydantic import BaseModel, ConfigDict, Field

from rosevear_ai_hub.campaign387 import GATES387

SCHEMA388 = "rosevear.hub.field-witness388.v1"
GATE_IDS = frozenset(gate[0] for gate in GATES387)
MAX_AGE_MS = 15 * 60 * 1000
HEX64 = re.compile(r"[0-9a-f]{64}")
HEX40 = re.compile(r"[0-9a-f]{40}")


class Witness388(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    role: Literal["original-host", "independent-reviewer"]
    gate_id: str = Field(min_length=1, max_length=64)
    host: Literal["DESKTOP-AE894KC"]
    release_sha: str = Field(pattern=r"^[0-9a-f]{40}$")
    evidence_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    challenge: str = Field(pattern=r"^[0-9a-f]{64}$")
    observed_at_ms: int = Field(ge=0, le=9007199254740991)
    signature: str = Field(pattern=r"^[0-9a-f]{128}$")


class WitnessPair388(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    original: Witness388
    independent: Witness388


def signing_bytes388(witness: Witness388) -> bytes:
    payload = {"schema": SCHEMA388, **witness.model_dump(exclude={"signature"})}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def reconcile388(
    pair: WitnessPair388,
    *,
    now_ms: int,
    original_key: str,
    reviewer_key: str,
    release_sha: str,
    original_host: bool,
) -> dict[str, object]:
    """Check cryptography against server pins; never certify uninspected evidence."""
    a, b = pair.original, pair.independent
    reason = "PAIRED_SIGNATURES_VALID_EVIDENCE_REVIEW_REQUIRED"
    verified = False
    if not original_host:
        reason = "HOLD_NOT_ORIGINAL_HOST"
    elif (
        not HEX64.fullmatch(original_key)
        or not HEX64.fullmatch(reviewer_key)
        or original_key == reviewer_key
        or not HEX40.fullmatch(release_sha)
    ):
        reason = "HOLD_TRUST_PINS_MISSING_OR_INVALID"
    elif a.role != "original-host" or b.role != "independent-reviewer":
        reason = "HOLD_ROLE_MISMATCH"
    elif (
        a.gate_id not in GATE_IDS
        or a.gate_id != b.gate_id
        or a.release_sha != release_sha
        or b.release_sha != release_sha
        or a.challenge != b.challenge
        or a.evidence_sha256 != b.evidence_sha256
    ):
        reason = "HOLD_SCOPE_MISMATCH"
    elif any(not 0 <= now_ms - w.observed_at_ms <= MAX_AGE_MS for w in (a, b)):
        reason = "HOLD_STALE_OR_FUTURE_WITNESS"
    elif b.observed_at_ms < a.observed_at_ms:
        reason = "HOLD_REVIEW_PRECEDES_OBSERVATION"
    else:
        try:
            for witness, key in ((a, original_key), (b, reviewer_key)):
                Ed25519PublicKey.from_public_bytes(bytes.fromhex(key)).verify(
                    bytes.fromhex(witness.signature), signing_bytes388(witness)
                )
            verified = True
        except (InvalidSignature, ValueError):
            reason = "HOLD_SIGNATURE_INVALID"
    return {
        "schema": SCHEMA388,
        "sourceBuild": 388,
        "gateId": a.gate_id if a.gate_id in GATE_IDS else None,
        "status": reason,
        "pairedSignaturesVerified": verified,
        "physicalEvidenceVerified": False,
        "challengeIssuanceVerified": False,
        "durableReplayProtectionVerified": False,
        "independentRecoveryClosed": False,
        "fieldCertified": False,
        "privateCommsReceiverActivationAuthorized": False,
        "evidencePersisted": False,
    }
