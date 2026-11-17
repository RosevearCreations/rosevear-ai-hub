"""QL-464: conservative readiness plan for the original Windows Master PC.

Read-only classifications. PowerShell observations are *unsigned* and never prove
a real unattended reboot, live remote peer, activated certificate, or OFF receiver.
"""
from __future__ import annotations

from typing import Any

from rosevear_ai_hub.master_shell349 import ORIGINAL_HOST
from rosevear_ai_hub.master_supervisor350 import SERVICES350

SCHEMA355 = "rosevear.hub.startup-readiness355.v1"
INVENTORY_SCHEMA355 = "rosevear.hub.windows-startup-inventory355.v1"
MAX_SAMPLE_AGE_MS = 120_000
PEERS355 = ("ai-data-platform", "rosevear-comms-hub")
MASTER_ORDER355 = ("ai-data-platform", "rosevear-ai-hub", "rosevear-comms-hub")
TASKS355 = (
    "Rosevear AI Hub Startup",
    "Rosevear AI Hub Recovery",
    "Rosevear Three-Master Observer QL460",
    "Rosevear AI Server Startup",
)


def trusted_shape355(value: Any, *, now_ms: int) -> bool:
    """A bounded original-host local *inventory*, NOT a signed boot witness."""
    if type(value) is not dict or type(now_ms) is not int:
        return False
    if value.get("schema") != INVENTORY_SCHEMA355 or value.get("originalHost") != ORIGINAL_HOST:
        return False
    when = value.get("observedAtMs")
    if type(when) is not int or not 0 <= now_ms - when <= MAX_SAMPLE_AGE_MS:
        return False
    tasks, services = value.get("tasks"), value.get("services")
    if type(tasks) is not list or type(services) is not list:
        return False
    if len(tasks) != len(TASKS355) or len(services) != len(MASTER_ORDER355) + 5:
        return False
    if [t.get("name") for t in tasks if type(t) is dict] != list(TASKS355):
        return False
    expected = list(SERVICES350.values()) + ["Mosquitto", "Ollama", "Caddy", "Tailscale", "go2rtc"]
    if [s.get("name") for s in services if type(s) is dict] != expected:
        return False
    return all(
        type(v) is dict
        and v.get("state") in ("RUNNING", "STOPPED", "DISABLED", "UNKNOWN", "NOT_INSTALLED")
        and v.get("startMode") in ("AUTOMATIC", "MANUAL", "DISABLED", "UNKNOWN", "NOT_INSTALLED")
        for v in services
    ) and all(
        type(v) is dict
        and v.get("state") in ("READY", "RUNNING", "DISABLED", "UNKNOWN", "NOT_INSTALLED")
        and v.get("trigger") in ("BOOT", "LOGON", "REPETITION", "OTHER", "UNKNOWN", "NOT_INSTALLED")
        for v in tasks
    )


def readiness_snapshot355(
    *,
    source350: dict[str, Any],
    source354: dict[str, Any],
    inventory: Any,
    now_ms: int,
    original_host: bool,
) -> dict[str, Any]:
    """Current original-host evidence without inventing installation or peer health."""
    identified = (
        original_host
        and source350.get("schema") == "rosevear.hub.three-master-observability350.v1"
        and source350.get("signedManifestVerified") is True
        and source350.get("originalHostVerified") is True
    )
    inventory_valid = identified and trusted_shape355(inventory, now_ms=now_ms)
    inv = inventory if inventory_valid else {}
    inv_services = {s["name"]: s for s in inv.get("services", [])}
    inv_tasks = {t["name"]: t for t in inv.get("tasks", [])}
    prior_modules = {
        m.get("id"): m for m in source350.get("modules", [])
        if type(m) is dict and type(m.get("id")) is str
    }
    services = []
    for module_id in MASTER_ORDER355:
        name = SERVICES350[module_id]
        local = inv_services.get(name, {})
        prior = prior_modules.get(module_id, {})
        sample_ms = prior.get("observedAtMs")
        fresh_source = (
            identified and type(sample_ms) is int
            and 0 <= now_ms - sample_ms <= MAX_SAMPLE_AGE_MS
            and prior.get("runtimeState") == "RUNNING"
        )
        services.append({
            "id": module_id,
            "serviceName": name,
            "observedState": "RUNNING_SOURCE_OBSERVATION" if fresh_source else "UNVERIFIED",
            "windowsStartMode": local.get("startMode", "UNKNOWN"),
            "windowsServiceState": local.get("state", "UNKNOWN"),
            "autonomousBootProven": False,
            "independentRuntimeActivationProven": False,
        })
    tasks = [{
        "name": name,
        "state": inv_tasks.get(name, {}).get("state", "UNKNOWN"),
        "trigger": inv_tasks.get(name, {}).get("trigger", "UNKNOWN"),
        "automaticBootProven": False,
    } for name in TASKS355]
    prior_sinks = source354.get("peerSinks", {}) if source354.get("schema") == "rosevear.hub.master-acceptance354.v1" else {}
    peer_health = [{
        "id": peer,
        "historicalSignedSink": prior_sinks.get(peer) == "PEER_SIGNED_SINK_ONLY",
        "currentlyConnected": False,
        "state": "HOLD_LIVE_SIGNED_PEER_HEALTH_REQUIRED",
    } for peer in PEERS355]
    prior_cert = source354.get("certificateRotation", {}) if source354.get("schema") == "rosevear.hub.master-acceptance354.v1" else {}
    rotation_state = prior_cert.get("state") if type(prior_cert) is dict else None
    return {
        "schema": SCHEMA355,
        "sourceBuild": 355,
        "serverShell": "ai-data-platform",
        "originalHost": ORIGINAL_HOST,
        "identifiedOriginalHost": identified,
        "inventoryFreshButUnsigned": bool(inventory_valid),
        "inventoryIsIndependentBootProof": False,
        "operationalReadiness": "HOLD_PRE_REBOOT_TEST",
        "nextOwnerAction": "REVIEW_LOCAL_PREFLIGHT_BEFORE_ANY_REBOOT",
        "continuousMonitor": {
            "configuredTask": "Rosevear Three-Master Observer QL460",
            "taskState": inv_tasks.get("Rosevear Three-Master Observer QL460", {}).get("state", "UNKNOWN"),
            "actualUnattendedRecoveryVerified": False,
            "twentyFourHourContinuityVerified": False,
        },
        "masterServices": services,
        "windowsTasks": tasks,
        "peerHealth": peer_health,
        "certificateRotation": {
            "priorPlanState": rotation_state if type(rotation_state) is str else "HOLD_NO_VERIFIED_PLAN",
            "rotationCompleted": False,
            "newManifestAndSignedPeerAckVerified": False,
            "automaticCertificateActivationAuthorized": False,
        },
        "requiredDependencies": [
            {"id": "hyperv-home-assistant", "status": "REQUIRES_LOCAL_VM_AUTOSTART_INSPECTION"},
            {"id": "mosquitto", "status": inv_services.get("Mosquitto", {}).get("state", "UNKNOWN")},
            {"id": "ollama", "status": inv_services.get("Ollama", {}).get("state", "UNKNOWN")},
            {"id": "caddy", "status": inv_services.get("Caddy", {}).get("state", "UNKNOWN")},
            {"id": "tailscale", "status": inv_services.get("Tailscale", {}).get("state", "UNKNOWN")},
            {"id": "hub-api-web-camera", "status": "REQUIRES_ORIGINAL_HOST_HEALTH_AND_RECOVERY_TEST"},
            {"id": "external-master-apps", "status": "DEPLOY_INDEPENDENTLY_DO_NOT_AUTO_START_RECEIVER"},
        ],
        "preRebootGates": [
            "CHECK_WINDOWS_SERVICE_INSTALL_AND_AUTOMATIC_MODE",
            "CHECK_HUB_LOGON_VERSUS_BOOT_TASKS",
            "CHECK_QL460_OBSERVER_ACTUAL_ENABLED_STATE",
            "CHECK_VM_AND_SUPPORT_SERVICE_BOOT_DEPENDENCIES",
            "CHECK_SEPARATE_AI_DATA_AND_COMMS_WORKER_APPROVAL",
            "CHECK_PROTECTED_MANIFEST_KEYS_AND_CERTIFICATE_EXPIRY",
            "CAPTURE_GENUINE_PREBOOT_AND_POSTBOOT_RECEIPTS",
        ],
        "protocolPreferred": "1.1",
        "protocolLegacyCompatible": "1.0",
        "receiverActivationAuthorized": False,
        "physicalReceiverCurrentlyOff": False,
        "incidentStatus": "OPEN",
        "webMutationAvailable": False,
    }
