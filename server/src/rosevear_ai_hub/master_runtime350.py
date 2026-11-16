"""Build 350: owner-pinned peer key custody and fail-closed read-only dashboard."""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import os
import platform
import time
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST, SLAVE_SHELLS, load_local_manifest349
from rosevear_ai_hub.master_supervisor350 import CustodyJournal350, SERVICES350
from rosevear_ai_hub.service_identity347 import (
    PublicKey347,
    Registry347,
    _canonical,
    _digest,
    _sha,
)
from rosevear_ai_hub.slave_telemetry350 import TelemetryJournal350

REGISTRY_SCHEMA350 = "rosevear.hub.signed-slave-key-registry350.v1"
MAX_FILE_BYTES = 32_768


def _load_blob(path: Path | None, maximum: int) -> bytes | None:
    if not isinstance(path, Path) or not path.is_file() or path.is_symlink():
        return None
    try:
        if path.stat().st_size > maximum:
            return None
        return path.read_bytes()
    except OSError:
        return None


def load_owner_registry350(
    *, path: Path | None, owner_key: bytes | None, owner_pin: str | None,
    enrollment: dict[str, Any], now_ms: int, machine_name: str,
) -> Registry347 | None:
    """Signed local public registry, never remote key self-enrollment."""
    raw = _load_blob(path, MAX_FILE_BYTES)
    if not (
        raw is not None
        and type(owner_key) is bytes and len(owner_key) == 32
        and type(owner_pin) is str and _sha(owner_pin)
        and hashlib.sha256(owner_key).hexdigest() == owner_pin
        and enrollment.get("accepted") is True
        and type(machine_name) is str and machine_name.upper() == ORIGINAL_HOST
    ):
        return None
    try:
        config = json.loads(raw)
        if not (
            type(config) is dict
            and set(config) == {"payload", "signature"}
            and type(config["signature"]) is str
            and len(config["signature"]) == 128
            and type(config["payload"]) is dict
        ):
            return None
        p = config["payload"]
        if not (
            set(p) == {
                "schema", "originalHost", "manifestDigest", "issuedAtMs",
                "expiresAtMs", "keys",
            }
            and p["schema"] == REGISTRY_SCHEMA350
            and p["originalHost"] == ORIGINAL_HOST
            and p["manifestDigest"] == _digest(enrollment["payload"])
            and type(p["issuedAtMs"]) is int
            and type(p["expiresAtMs"]) is int
            and 0 <= now_ms - p["issuedAtMs"] <= 30 * 86_400_000
            and p["issuedAtMs"] < p["expiresAtMs"] <= p["issuedAtMs"] + 30 * 86_400_000
            and now_ms < p["expiresAtMs"]
            and type(p["keys"]) is list and len(p["keys"]) <= 8
        ):
            return None
        Ed25519PublicKey.from_public_bytes(owner_key).verify(
            bytes.fromhex(config["signature"]), _canonical(p)
        )
        entries = []
        allowed = {peer["id"] for peer in enrollment["payload"]["peers"]}
        for key in p["keys"]:
            if not (
                type(key) is dict
                and set(key) == {
                    "issuer", "keyId", "publicDerBase64", "activeFromMs",
                    "activeUntilMs", "revokedAtMs",
                }
                and type(key["issuer"]) is str
                and key["issuer"] in SLAVE_SHELLS
                and key["issuer"] in allowed
                and type(key["keyId"]) is str
                and type(key["publicDerBase64"]) is str
            ):
                return None
            public_der = base64.b64decode(key["publicDerBase64"], validate=True)
            entries.append(
                PublicKey347(
                    issuer=key["issuer"], key_id=key["keyId"],
                    public_der=public_der, pin_sha256=hashlib.sha256(public_der).hexdigest(),
                    active_from_ms=key["activeFromMs"], active_until_ms=key["activeUntilMs"],
                    revoked_at_ms=key["revokedAtMs"],
                )
            )
        return Registry347(tuple(entries))
    except (
        InvalidSignature, ValueError, TypeError, KeyError, AttributeError,
        OSError, UnicodeError, OverflowError, binascii.Error,
    ):
        return None


def owner_shell_snapshot350(
    enrollment: dict[str, Any], *, custody: CustodyJournal350 | None,
    telemetry: TelemetryJournal350 | None, registry: Registry347 | None,
    now_ms: int, machine_name: str,
) -> dict[str, Any]:
    """No network request, Windows service action, or self-asserted CONNECTED."""
    accepted = enrollment.get("accepted") is True
    original_host = machine_name.upper() == ORIGINAL_HOST and os.name == "nt"
    enabled = accepted and original_host
    payload = enrollment.get("payload") if enabled else None
    manifest_digest = _digest(payload) if payload else None
    observed = custody.recent(manifest_digest, now_ms) if custody and manifest_digest else {}
    by_module = {m["id"]: m for m in payload["modules"]} if payload else {}
    by_peer = {p["id"]: p for p in payload["peers"]} if payload else {}
    applications = []
    for peer_id in SLAVE_SHELLS:
        peer = by_peer.get(peer_id)
        evidence = (
            telemetry.recent(
                peer_id=peer_id, manifest_digest=manifest_digest,
                pin=peer["tlsLeafPin"], now_ms=now_ms, registry=registry,
            )
            if peer and telemetry and registry and manifest_digest else None
        )
        applications.append({
            "id": peer_id, "role": "slave-shell",
            "connected": evidence is not None,
            "state": evidence["state"] if evidence else "UNVERIFIED",
            "latencyMs": evidence["latencyMs"] if evidence else None,
            "uptimeSec": evidence["uptimeSec"] if evidence else None,
            "recentErrors": evidence["recentErrors"] if evidence else None,
            "queueLag": evidence["queueLag"] if evidence else None,
            "observedAtMs": evidence["observedAtMs"] if evidence else None,
            "proof": evidence["proof"] if evidence else "NO_FRESH_AUTHENTICATED_SAMPLE",
        })
    return {
        "schema": "rosevear.hub.three-master-observability350.v1",
        "sourceBuild": 350, "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST, "originalHostVerified": original_host,
        "signedManifestVerified": enabled, "signedSlaveRegistryVerified": enabled and registry is not None,
        "protocolPreferred": "1.1", "protocolLegacyCompatible": "1.0",
        "modules": [
            {
                "id": module, "serviceName": SERVICES350[module],
                "role": ("server-shell", "local-automation", "communications")[i],
                "theme": by_module[module]["theme"] if module in by_module else "instrument",
                "desiredEnabled": (
                    by_module[module]["desiredEnabled"] if module in by_module else None
                ),
                "runtimeState": (
                    observed[module]["state"] if module in observed else "UNVERIFIED"
                ),
                "observedAtMs": (
                    observed[module]["observedAtMs"] if module in observed else None
                ),
                "actionPolicy": "LOCAL_SIGNED_OWNER_PERMIT_ONLY",
                "independentRelease": True,
            }
            for i, module in enumerate(SERVICES350)
        ],
        "applications": applications,
        "liveAutomationHostVerified": enabled and len(observed) == len(SERVICES350)
        and all(v["state"] == "RUNNING" for v in observed.values()),
        "supervisorLoopInstalledVerified": False,
        "serviceStartupTaskInstalledVerified": False,
        "globalConnectivityVerified": False,
        "receiver": "UNKNOWN_REQUIRES_FRESH_INDEPENDENT_OFF",
        "incidentStatus": "OPEN", "activationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "webServiceMutationAvailable": False,
        "message": (
            "Read-only status from original-host local journals; signed sample is per-peer "
            "evidence only. Service commands require local owner-signed permit and "
            "independent Windows SCM verification."
        ),
    }


def installed_shell_snapshot350() -> dict[str, Any]:
    now_ms = int(time.time() * 1000)
    host = platform.node()
    manifest = os.environ.get("ROSEVEAR_QL458_MANIFEST_PATH")
    key_path = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PATH")
    pin = os.environ.get("ROSEVEAR_QL458_OWNER_KEY_PIN")
    enrollment = load_local_manifest349(
        Path(manifest) if manifest else None,
        Path(key_path) if key_path else None, pin, now_ms, host,
    )
    def _journal_path(name: str) -> Path | None:
        value = os.environ.get(name)
        return Path(value) if value else None

    key = _load_blob(Path(key_path), 32) if key_path else None
    registry = load_owner_registry350(
        path=_journal_path("ROSEVEAR_QL459_REGISTRY_PATH"),
        owner_key=key, owner_pin=pin, enrollment=enrollment,
        now_ms=now_ms, machine_name=host,
    )
    custody_path = _journal_path("ROSEVEAR_QL459_CUSTODY_DB")
    telemetry_path = _journal_path("ROSEVEAR_QL459_TELEMETRY_DB")
    return owner_shell_snapshot350(
        enrollment,
        custody=CustodyJournal350(custody_path) if custody_path else None,
        telemetry=TelemetryJournal350(telemetry_path) if telemetry_path else None,
        registry=registry, now_ms=now_ms, machine_name=host,
    )
