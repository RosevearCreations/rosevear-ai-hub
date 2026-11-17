"""Build 355: stale/injected PowerShell samples never imply autonomous startup."""
from fastapi.testclient import TestClient

from rosevear_ai_hub.api.server_shell355 import local_readiness_snapshot355, router
from rosevear_ai_hub.main import app
from rosevear_ai_hub.master_readiness355 import (
    INVENTORY_SCHEMA355,
    MASTER_ORDER355,
    SERVICES350,
    TASKS355,
    readiness_snapshot355,
    trusted_shape355,
)

NOW = 1_800_000_000_000


def _inventory():
    return {
        "schema": INVENTORY_SCHEMA355,
        "originalHost": "DESKTOP-AE894KC",
        "observedAtMs": NOW - 2000,
        "tasks": [{"name": name, "state": "READY", "trigger": "BOOT"} for name in TASKS355],
        "services": [
            {"name": name, "state": "RUNNING", "startMode": "AUTOMATIC"}
            for name in list(SERVICES350.values())
            + ["Mosquitto", "Ollama", "Caddy", "Tailscale", "go2rtc"]
        ],
    }


def _source350():
    return {
        "schema": "rosevear.hub.three-master-observability350.v1",
        "signedManifestVerified": True,
        "originalHostVerified": True,
        "modules": [
            {"id": module, "runtimeState": "RUNNING", "observedAtMs": NOW - 500}
            for module in MASTER_ORDER355
        ],
    }


def _source354():
    return {
        "schema": "rosevear.hub.master-acceptance354.v1",
        "peerSinks": {
            "ai-data-platform": "PEER_SIGNED_SINK_ONLY",
            "rosevear-comms-hub": "PEER_SIGNED_SINK_ONLY",
        },
        "certificateRotation": {"state": "OWNER_SIGNED_CERTIFICATE_ROTATION_PLAN_ACCEPTED"},
    }


def _evaluate(sample=None, *, now=NOW, original=True):
    return readiness_snapshot355(
        source350=_source350(),
        source354=_source354(),
        inventory=_inventory() if sample is None else sample,
        now_ms=now,
        original_host=original,
    )


def test_fresh_all_running_is_not_an_unattended_boot_witness():
    evidence = _evaluate()
    assert evidence["inventoryFreshButUnsigned"] is True
    assert evidence["operationalReadiness"] == "HOLD_PRE_REBOOT_TEST"
    assert evidence["inventoryIsIndependentBootProof"] is False
    assert all(not svc["autonomousBootProven"] for svc in evidence["masterServices"])
    assert all(not item["currentlyConnected"] for item in evidence["peerHealth"])
    assert all(item["historicalSignedSink"] for item in evidence["peerHealth"])
    assert evidence["certificateRotation"]["rotationCompleted"] is False
    assert evidence["receiverActivationAuthorized"] is False
    assert evidence["physicalReceiverCurrentlyOff"] is False


def test_stale_wrong_host_forged_and_malformed_samples_hold():
    good = _inventory()
    assert trusted_shape355(good, now_ms=NOW)
    assert not trusted_shape355({**good, "observedAtMs": NOW - 120_001}, now_ms=NOW)
    assert not trusted_shape355({**good, "originalHost": "OTHER"}, now_ms=NOW)
    assert not trusted_shape355({**good, "tasks": []}, now_ms=NOW)
    forged_services = [{**good["services"][0], "state": "GREEN"}]
    assert not trusted_shape355({**good, "services": forged_services}, now_ms=NOW)
    assert _evaluate({**good, "observedAtMs": NOW - 120_001})["inventoryFreshButUnsigned"] is False
    offhost = _evaluate(good, original=False)
    assert offhost["identifiedOriginalHost"] is False
    assert offhost["inventoryFreshButUnsigned"] is False


def test_missing_signed_original_host_evidence_cannot_show_running():
    source = _source350()
    source["signedManifestVerified"] = False
    result = readiness_snapshot355(
        source350=source,
        source354={},
        inventory=_inventory(),
        now_ms=NOW,
        original_host=True,
    )
    assert all(s["observedState"] == "UNVERIFIED" for s in result["masterServices"])
    assert all(not p["historicalSignedSink"] for p in result["peerHealth"])


def test_route_is_owner_only_and_never_mutates():
    client = TestClient(app)
    uri = "/api/v1/system/server-shell-355"
    assert all(route.methods == {"GET"} for route in router.routes)
    assert client.get(uri).status_code in (401, 403)
    for method in ("post", "put", "patch", "delete"):
        assert getattr(client, method)(uri).status_code in (401, 403, 405)
    offhost = local_readiness_snapshot355(now_ms=NOW, machine_name="OTHER")
    assert offhost["webMutationAvailable"] is False
    assert offhost["operationalReadiness"] == "HOLD_PRE_REBOOT_TEST"
