"""Build 306: protected original-host evidence import and three-master trend.

No network sender, receiver, enrollment UI, scheduler, Windows recovery action,
or automatic promotion of a source-only observation to CONNECTED is present.
"""

import base64
import hashlib
import os
import platform
import re
import socket
import sqlite3
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from rosevear_ai_hub.master_shell_acceptance305 import (
    COMMS_SCHEMA,
    _serialize,
    _strict_samples,
    _timestamp,
)
from rosevear_ai_hub.master_shell_monitor304 import (
    PersistentReeMonitor304,
    storage_location304,
)
from rosevear_ai_hub.master_shell_uptime303 import ORIGINAL_HOST
from rosevear_ai_hub.release_observability import safe_document, safe_sha

SOURCE = "rosevear-ai-hub"
AIHUB305_MAIN = "27b234337f5a3f041dfca4541e33ed6aa821fa4f"
COMMS_QL412_MAIN = "e42ffa856595a2d24c634653d83b1d80f2d6eaa4"
AIDATA_361_MAIN = "69355a853f10bbe4d3785bcede8b44e0c788be65"
CONTROLLER_360 = "4b45b435fa7b6fc83b94e31556648fe4190a9f53"
HEX64 = re.compile(r"[0-9a-f]{64}\Z")
HEX40 = re.compile(r"[0-9a-f]{40}\Z")
EPISODE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{7,95}\Z")
REVIEW_SCHEMA = "rosevear.ai-hub.ree-owner-release-review306.v1"


def _hold(reason: str) -> dict[str, object]:
    return {
        "state": reason,
        "accepted": False,
        "sourceId": SOURCE,
        "connection": "HOLD",
        "receiver": "OFF",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


def _ree_monitor_ready(monitor: PersistentReeMonitor304) -> bool:
    if (
        platform.system() != "Windows"
        or socket.gethostname().upper() != ORIGINAL_HOST
        or not monitor.persist_eligible
    ):
        return False
    snapshot = monitor.persistent_snapshot304()
    return bool(
        snapshot.get("collectionState") == "OBSERVING_REE_LOCAL"
        and type(snapshot.get("sampleCount")) is int
        and snapshot["sampleCount"] >= 2
    )


def _trusted_signature(
    payload: Any, signature: Any, public_spki_der: bytes | None, independent_sha256: str
) -> bool:
    """The independent public pin must come from protected owner configuration."""
    if (
        not isinstance(payload, dict)
        or not isinstance(signature, str)
        or type(public_spki_der) is not bytes
        or len(public_spki_der) > 256
        or not isinstance(independent_sha256, str)
        or not HEX64.fullmatch(independent_sha256)
        or hashlib.sha256(public_spki_der).hexdigest() != independent_sha256
    ):
        return False
    try:
        raw = base64.b64decode(signature, validate=True)
        if len(raw) != 64 or base64.b64encode(raw).decode() != signature:
            return False
        public = serialization.load_der_public_key(public_spki_der)
        if not isinstance(public, Ed25519PublicKey):
            return False
        public.verify(raw, _serialize(payload))
        return True
    except (ValueError, TypeError, InvalidSignature, OverflowError):
        return False


class ProtectedSourceImportLedger306:
    """Original-host single-use episode claims, durable over process restarts.

    Call only after independent source signature and owner authorization. A
    project checkout, browser or cloud CI must never serve as this ledger.
    """

    def __init__(self, path: Path) -> None:
        self.path = path

    @classmethod
    def on_original_host(cls) -> "ProtectedSourceImportLedger306 | None":
        location = storage_location304(os.getenv("LOCALAPPDATA"))
        if (
            platform.system() != "Windows"
            or socket.gethostname().upper() != ORIGINAL_HOST
            or location is None
        ):
            return None
        return cls(location.with_name("source-episode-import306.sqlite3"))

    def claim(self, *, source_id: str, episode_id: str, envelope_sha256: str) -> bool:
        if (
            platform.system() != "Windows"
            or socket.gethostname().upper() != ORIGINAL_HOST
            or source_id != SOURCE
            or not isinstance(episode_id, str)
            or not EPISODE.fullmatch(episode_id)
            or not isinstance(envelope_sha256, str)
            or not HEX64.fullmatch(envelope_sha256)
        ):
            return False
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with sqlite3.connect(self.path, timeout=2) as db:
                db.execute("PRAGMA busy_timeout=2000")
                db.execute("BEGIN IMMEDIATE")
                db.execute(
                    """CREATE TABLE IF NOT EXISTS source_import306 (
                        episode_id TEXT PRIMARY KEY,
                        envelope_sha256 TEXT NOT NULL,
                        imported_at_utc TEXT NOT NULL
                    )"""
                )
                result = db.execute(
                    "INSERT OR IGNORE INTO source_import306 VALUES (?,?,?)",
                    (episode_id, envelope_sha256, str(int(time.time()))),
                )
                return result.rowcount == 1
        except (OSError, sqlite3.Error):
            return False

    def was_claimed(self, *, source_id: str, episode_id: str, envelope_sha256: str) -> bool:
        """Build 307 read-back: only a prior exact protected import counts.

        Never create a database or accept caller-supplied claim summaries as
        proof of a previous original-host intake.
        """
        if (
            platform.system() != "Windows"
            or socket.gethostname().upper() != ORIGINAL_HOST
            or source_id != SOURCE
            or not isinstance(episode_id, str)
            or not EPISODE.fullmatch(episode_id)
            or not isinstance(envelope_sha256, str)
            or not HEX64.fullmatch(envelope_sha256)
            or not self.path.is_file()
        ):
            return False
        try:
            with sqlite3.connect(self.path, timeout=2) as db:
                result = db.execute(
                    "SELECT envelope_sha256 FROM source_import306 WHERE episode_id=?",
                    (episode_id,),
                ).fetchone()
                return result is not None and result[0] == envelope_sha256
        except (OSError, sqlite3.Error):
            return False


def review_original_owner_release306(
    root: Path,
    monitor: PersistentReeMonitor304,
    signed_field_review: Any,
    *,
    reviewer_public_der: bytes | None,
    independent_reviewer_pin: str,
    expected_installed_revision: str = AIHUB305_MAIN,
    owner_authorize: Callable[..., bool] | None = None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Review separately signed launcher/process field evidence on Ree only.

    No boolean inside the imported review authorizes itself: the independently
    provisioned reviewer key and a separate live owner authority are mandatory.
    """
    if not _ree_monitor_ready(monitor) or not callable(owner_authorize):
        return _hold("HOLD_ORIGINAL_HOST_MONITOR_OR_OWNER_AUTHORITY")
    if not isinstance(signed_field_review, dict) or set(signed_field_review) != {
        "payload",
        "signature",
    }:
        return _hold("HOLD_MISSING_PROTECTED_FIELD_REVIEW")
    body = signed_field_review["payload"]
    keys = {
        "schema",
        "sourceId",
        "originalHost",
        "reviewerHost",
        "sourceRevision",
        "observedAt",
        "releasePointerSha",
        "loadedProcessSha",
        "launcherPid",
        "processPid",
        "processEvidenceSha256",
        "ownerConsentReference",
    }
    if not isinstance(body, dict) or set(body) != keys:
        return _hold("HOLD_FIELD_REVIEW_SCHEMA")
    now = int(time.time() * 1000) if now_ms is None else now_ms
    when = _timestamp(body["observedAt"])
    recorded = safe_sha(safe_document(root / "logs" / "hub-deployment" / "active.json").get("sha"))
    if (
        body["schema"] != REVIEW_SCHEMA
        or body["sourceId"] != SOURCE
        or body["originalHost"] != ORIGINAL_HOST
        or body["reviewerHost"] != "TEMPLAR"
        or not isinstance(expected_installed_revision, str)
        or not HEX40.fullmatch(expected_installed_revision)
        or body["sourceRevision"] != expected_installed_revision
        or body["releasePointerSha"] != expected_installed_revision
        or body["loadedProcessSha"] != expected_installed_revision
        or recorded != expected_installed_revision
        or type(body["launcherPid"]) is not int
        or body["launcherPid"] <= 0
        or type(body["processPid"]) is not int
        or body["processPid"] <= 0
        or not isinstance(body["processEvidenceSha256"], str)
        or not HEX64.fullmatch(body["processEvidenceSha256"])
        or not isinstance(body["ownerConsentReference"], str)
        or not EPISODE.fullmatch(body["ownerConsentReference"])
        or type(now) is not int
        or when is None
        or not 0 <= now - when <= 30 * 60_000
    ):
        return _hold("HOLD_REVISION_PROCESS_POINTER_OR_FRESHNESS")
    if not _trusted_signature(
        body, signed_field_review["signature"], reviewer_public_der, independent_reviewer_pin
    ):
        return _hold("HOLD_INDEPENDENT_REVIEW_SIGNATURE")
    digest = hashlib.sha256(_serialize(body)).hexdigest()
    try:
        permitted = (
            owner_authorize(
                source_id=SOURCE,
                source_revision=expected_installed_revision,
                review_sha256=digest,
                consent_reference=body["ownerConsentReference"],
            )
            is True
        )
    except (OSError, ValueError, TypeError):
        permitted = False
    if not permitted:
        return _hold("HOLD_INDEPENDENT_OWNER_CONSENT")
    return {
        **_hold("REVIEWED_SIGNED_ORIGINAL_PROCESS_EVIDENCE_NOT_CONNECTED"),
        "accepted": True,
        "reviewSha256": digest,
        "sourceRevision": expected_installed_revision,
        "reviewedAt": body["observedAt"],
        "verificationScope": "INDEPENDENT_REVIEWER_WITNESSED_PROCESS_FIELD_EVIDENCE",
    }


def import_protected_source_one_test306(
    monitor: PersistentReeMonitor304,
    envelope: Any,
    *,
    source_public_der: bytes | None,
    independent_source_pin: str,
    expected_installed_revision: str = AIHUB305_MAIN,
    owner_authorize: Callable[..., bool] | None = None,
    claim_imported_episode: Callable[..., bool] | None = None,
    now_ms: int | None = None,
) -> dict[str, object]:
    """Import one source-signed QL-411/412 metadata receipt, never Comms ACK.

    The caller owns atomic durable import claims and protected owner consent.
    An imported source envelope cannot imply the receiver accepted that TEST.
    """
    if (
        not _ree_monitor_ready(monitor)
        or not callable(owner_authorize)
        or not callable(claim_imported_episode)
    ):
        return _hold("HOLD_ORIGINAL_HOST_OR_PROTECTED_IMPORT_AUTHORITY")
    if not isinstance(envelope, dict) or set(envelope) != {"payload", "signature"}:
        return _hold("HOLD_MISSING_SOURCE_ENVELOPE")
    payload = envelope["payload"]
    now = int(time.time() * 1000) if now_ms is None else now_ms
    if (
        type(now) is not int
        or not isinstance(payload, dict)
        or list(payload)
        != ["schema", "sourceId", "hostId", "sourceRevision", "capturedAt", "episodeId", "samples"]
    ):
        return _hold("HOLD_SOURCE_ENVELOPE_FORMAT")
    captured = _timestamp(payload["capturedAt"])
    if (
        payload["schema"] != COMMS_SCHEMA
        or payload["sourceId"] != SOURCE
        or payload["hostId"] != ORIGINAL_HOST
        or not isinstance(expected_installed_revision, str)
        or not HEX40.fullmatch(expected_installed_revision)
        or payload["sourceRevision"] != expected_installed_revision
        or not isinstance(payload["episodeId"], str)
        or not EPISODE.fullmatch(payload["episodeId"])
        or captured is None
        or not 0 <= now - captured <= 5 * 60_000
        or _strict_samples(payload["samples"], now_ms=captured) is None
    ):
        return _hold("HOLD_SOURCE_REVISION_AGE_OR_MEASUREMENTS")
    if not _trusted_signature(
        payload, envelope["signature"], source_public_der, independent_source_pin
    ):
        return _hold("HOLD_SOURCE_SIGNER_UNENROLLED_OR_INVALID")
    digest = hashlib.sha256(_serialize(payload)).hexdigest()
    try:
        if (
            owner_authorize(
                source_id=SOURCE,
                source_revision=expected_installed_revision,
                episode_id=payload["episodeId"],
                envelope_sha256=digest,
            )
            is not True
        ):
            return _hold("HOLD_OWNER_ONE_TEST_IMPORT_NOT_APPROVED")
        if (
            claim_imported_episode(
                source_id=SOURCE,
                episode_id=payload["episodeId"],
                envelope_sha256=digest,
            )
            is not True
        ):
            return _hold("HOLD_PROTECTED_DURABLE_IMPORT_REPLAY_OR_STORAGE")
    except (OSError, ValueError, TypeError):
        return _hold("HOLD_PROTECTED_DURABLE_IMPORT_REPLAY_OR_STORAGE")
    return {
        **_hold("SOURCE_SIGNED_ONE_TEST_IMPORTED_COMMS_ACK_HOLD"),
        "accepted": True,
        "sourceRevision": expected_installed_revision,
        "episodeId": payload["episodeId"],
        "envelopeSha256": digest,
        "commsReceiverSignedAck": "HOLD_NOT_PROVIDED_BY_QL412",
        "transportSent": False,
    }


def reconcile_three_master_uptime306(monitor: PersistentReeMonitor304) -> dict[str, object]:
    """Source-only UTC trend; other masters stay UNKNOWN without signed feeds."""
    ready = _ree_monitor_ready(monitor)
    trend = (
        monitor.ledger.observed_daily_trend306(int(time.time() * 1000))
        if ready and monitor.ledger is not None
        else None
    )
    if trend is None:
        trend = []
    return {
        "schema": "rosevear.ai-hub.master360-three-master-acceptance306.v1",
        "sourceId": SOURCE,
        "sourceBuild": 306,
        "originalHost": ORIGINAL_HOST,
        "sourceMain305AtReconciliation": AIHUB305_MAIN,
        "controllerMain361AtReconciliation": AIDATA_361_MAIN,
        "commsMainQl412AtReconciliation": COMMS_QL412_MAIN,
        "controller360Contract": CONTROLLER_360,
        "observedLocalTrend": trend,
        "trendLabel": "OBSERVED_LOCAL_TCP_REACHABILITY_NOT_END_TO_END_UPTIME",
        "masterSources": [
            {
                "id": SOURCE,
                "state": (
                    "LOCAL_REE_SAMPLES_NOT_MASTER_ACCEPTANCE"
                    if trend
                    else "HOLD_NO_FRESH_ORIGINAL_HOST_SAMPLES"
                ),
            },
            {
                "id": "ai-data-platform",
                "state": "HOLD_NO_AUTHENTICATED_CONTROLLER_UPTIME_PROJECTION",
            },
            {"id": "rosevear-comms-hub", "state": "HOLD_NO_SIGNED_RECEIVER_UPTIME_ACK"},
        ],
        "installedReleaseAcceptance": "HOLD_NO_INDEPENDENT_SIGNED_REE_FIELD_REVIEW_IMPORTED",
        "sourceOneTestImport": "HOLD_NO_OWNER_AUTHORIZED_SIGNED_SOURCE_ENVELOPE_IMPORTED",
        "commsAck": "HOLD_NO_SIGNED_QL412_RECEIVER_ACK",
        "automationHost": "DESKTOP-AE894KC_ONLY",
        "newWindowsScheduledTasks": 0,
        "existingLauncherChanged": False,
        "existingRecoveryTaskChanged": False,
        "receiver": "OFF",
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }
