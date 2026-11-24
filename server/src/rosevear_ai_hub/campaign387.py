"""Build 387 owner campaign: bounded source inventory and honest field HOLD.

The source lists precise, manual acceptance steps for household and three-Master
workflows. It does not perform device scans, printer jobs, camera streaming,
automation, provider writes, private Comms receiver activation, or restores.
"""

from __future__ import annotations

from typing import Any

from rosevear_ai_hub.it_operations385 import runtime_snapshot385

SCHEMA387 = "rosevear.hub.household-master-acceptance387.v1"

# Exact non-executable review routes: section labels are existing frontend sections.
# A physical review requires independent device/peer evidence, not an owner click.
GATES387 = (
    (
        "original-host-path",
        "Original Windows source and launcher",
        "System",
        "Match the running API and approved Windows Task Scheduler actions to "
        "the correct existing Git remote and protected main SHA; protect local changes.",
        "WINDOWS_LAUNCHER_ORIGINAL_HOST_INDEPENDENT",
    ),
    (
        "bounded-household-discovery",
        "Whole-house device discovery and private LAN",
        "Devices",
        "With owner authorization, review Home Assistant actual device identities "
        "and offline/renamed-room differences; do not automatically scan networks.",
        "HOME_ASSISTANT_ACTUAL_ORIGINAL_DEVICE",
    ),
    (
        "ha-mqtt-guest",
        "Home Assistant VM and MQTT guest health",
        "MQTT",
        "Observe the genuine pinned VM and MQTT add-on on Windows, then confirm "
        "a real message/HA device with private provider evidence, no duplicate broker.",
        "PROVIDER_AUTHENTICATED_GUEST_WITNESS",
    ),
    (
        "printer-pc-job",
        "Original Printer-PC job monitoring",
        "Workshop",
        "Review an authorized real Ender printer job through the enrolled Printer-PC "
        "agent; verify the job/device ID, status timestamps and owner-safe stops.",
        "PRINTER_PC_ORIGINAL_JOB_RECEIPT",
    ),
    (
        "camera-live-stream",
        "Real private camera/doorbell stream",
        "Cameras",
        "From an authorized original camera and trusted client, verify moving video "
        "and its stream identity; a registration or placeholder is not proof.",
        "CAMERA_REAL_STREAM_WITNESS",
    ),
    (
        "grocery-pantry-transaction",
        "Grocery list and pantry transaction",
        "Groceries",
        "Use a private test item to create, revise and remove a list entry in the "
        "actual running owner account; confirm durable readback and permitted roles.",
        "ORIGINAL_HOST_GROCERY_WRITE_READBACK",
    ),
    (
        "safe-automation",
        "Approved safe automation, no hazardous actuation",
        "Automations",
        "Review an explicitly approved low-risk scene with cause/deduplication, "
        "cooldown and stop checks; do not run safety-sensitive or unapproved actions.",
        "AUTHORIZED_SAFE_ACTUATION_WITNESS",
    ),
    (
        "three-master-ack",
        "Actual signed three-Master ACK continuity",
        "System",
        "Review independent AI Data Platform and Comms Hub source identity, genuine "
        "mTLS signed receipts, replay refusal and a real return ACK; keep private "
        "receiver QL-340C OFF without separate authorization.",
        "INDEPENDENT_SIGNED_PEER_ACK",
    ),
    (
        "seven-application-intake",
        "Seven-application governed receipt correlation",
        "System",
        "Check seven genuine tenant-redacted and source-pinned signed producer "
        "receipts against independently verified receiver evidence; missing peers HOLD.",
        "SEVEN_GENUINE_SOURCE_RECEIPTS",
    ),
    (
        "encrypted-backup-restore",
        "Encrypted isolated backup and restore",
        "System",
        "Verify an authorized encrypted backup, independent separate-copy checksum "
        "and isolated scratch restoration; never overwrite a live database.",
        "INDEPENDENT_OFF_MACHINE_RESTORE",
    ),
    (
        "prelogin-cross-device",
        "Pre-login private HTTPS, phone and tablet",
        "System",
        "From an independently trusted client, test authenticated HTTPS/TLS access "
        "before Windows sign-in and after a supervised reboot; no blind reboot.",
        "INDEPENDENT_CLIENT_PRELOGIN_WITNESS",
    ),
    (
        "roles-privacy-security",
        "Role separation, MFA, privacy and denial",
        "Users",
        "Review owner versus non-owner API denial and protected session handling "
        "with a separate authorized account; never share credentials or secrets.",
        "INDEPENDENT_OWNER_AND_DENIED_ROLE_TEST",
    ),
    (
        "sixteen-theme-field",
        "16 themes across desktop, tablet and phone",
        "System",
        "Review all real device/view combinations, keyboard and zoom using the "
        "Build 386 workshop; CSS previews do not count as physical device proof.",
        "THREE_DEVICE_REAL_UI_VISUAL_WITNESS",
    ),
    (
        "incident-recovery-ledger",
        "Incident diagnosis, rollback and support custody",
        "System",
        "Inspect the original local IT desk and rollback runbook, record any "
        "actual failures and independently reconcile owner tickets; no auto restart.",
        "ORIGINAL_HOST_OWNER_PLUS_INDEPENDENT_AUDIT",
    ),
)


MODULE_IDS387 = (
    "local-ai-chat-and-voice",
    "knowledge-search-and-citations",
    "home-assistant-device-inventory",
    "safe-automations-and-scenes",
    "mqtt-and-sensors",
    "cameras-and-doorbells",
    "workshop-registry-and-jobs",
    "maker-process-monitoring",
    "network-discovery-and-topology",
    "network-sequencing-and-recovery",
    "alexa-integration",
    "apple-home-and-matter",
    "samsung-smartthings",
    "other-provider-device-coverage",
    "grocery-order-and-pantry-board",
    "household-calendar-and-chores",
    "three-master-signed-communications",
    "seven-application-governance",
    "security-roles-and-access",
    "backup-and-windows-recovery",
    "privacy-audit-and-consent",
    "themes-accessibility-and-controls",
    "mobile-and-tablet-experience",
    "it-ops-and-support",
)


def campaign_snapshot387(*, now_ms: int, original_host: bool) -> dict[str, Any]:
    """Return a safe read-only report; never assert a live test or an external ACK."""
    runtime = runtime_snapshot385(now_ms=now_ms, original_host=original_host)
    # The IT385 sampler does not independently verify service identity or LAN reachability.
    local_sample = runtime["status"] == "LOCAL_RUNTIME_DIAGNOSTICS_ONLY"
    return {
        "schema": SCHEMA387,
        "sourceBuild": 387,
        "status": (
            "ORIGINAL_HOST_LOCAL_CONTEXT_ONLY_FIELD_HOLD"
            if local_sample
            else "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT"
        ),
        "sampledAtMs": now_ms,
        "originalHostNameMatched": original_host,
        "runtimeSampleAvailable": local_sample,
        "runtimeSource": runtime["provenance"],
        "osBootLocallyReportedMs": runtime["osBootTimeMs"] if local_sample else None,
        "apiProcessUptimeObservedSeconds": (
            runtime["hubApiUptimeSeconds"] if local_sample else None
        ),
        "localLanInterfacesReportedUp": (
            runtime["lan"]["reportedUpCount"] if local_sample else None
        ),
        "localResourceWarningCodes": (
            [item["code"] for item in runtime["alerts"]] if local_sample else []
        ),
        "gateCount": len(GATES387),
        "trackedModuleCount": len(MODULE_IDS387),
        "fieldCertifiedModuleCount": 0,
        "modules": [
            {"id": module_id, "fieldStatus": "HOLD_INDEPENDENT_EVIDENCE_MISSING"}
            for module_id in MODULE_IDS387
        ],
        "fieldCertifiedCount": 0,
        "independentOriginalHostWitnessVerified": False,
        "realHouseholdDeviceEndToEndVerified": False,
        "realPrinterJobMonitored": False,
        "realCameraStreamVerified": False,
        "safeAutomationPhysicalExecutionVerified": False,
        "sevenSourceReceiptClosureVerified": False,
        "independentThreeMasterAckVerified": False,
        "offMachineRestoreIndependentlyVerified": False,
        "preLoginRemoteAccessIndependentlyVerified": False,
        "otherMasterApplicationsModified": False,
        "privateCommsReceiverActivationAuthorized": False,
        "backgroundNetworkOrDeviceProbesPerformed": 0,
        "windowsServicesRestarted": 0,
        "externalRequestsPerformed": 0,
        "productionGreenMayBeConcludedFromOwnerReports": False,
        "sourceReleaseAndFieldAcceptanceIndependent": True,
        "gates": [
            {
                "id": gate_id,
                "title": title,
                "section": section,
                "operatorProcedure": procedure,
                "requiredIndependentEvidence": evidence,
                "sourceVerified": False,
                "fieldStatus": "HOLD_INDEPENDENT_EVIDENCE_MISSING",
                "ownerReportIsSignedEvidence": False,
                "unsafeActuationAuthorized": False,
            }
            for gate_id, title, section, procedure, evidence in GATES387
        ],
    }
