"""Build 048: restricted, read-only resource snapshot."""

from pathlib import Path

from fastapi import APIRouter, Request, Response, status
from fastapi.exceptions import HTTPException

from rosevear_ai_hub.master_shell_acceptance305 import inspect_original_release305
from rosevear_ai_hub.master_shell_acceptance306 import reconcile_three_master_uptime306
from rosevear_ai_hub.master_shell_acceptance307 import reconcile_master_evidence307
from rosevear_ai_hub.master_shell_acceptance308 import reconcile_master_evidence308
from rosevear_ai_hub.master_shell_acceptance309 import reconcile_master_evidence309
from rosevear_ai_hub.master_shell_acceptance310 import reconcile_master_evidence310
from rosevear_ai_hub.master_shell_acceptance311 import reconcile_master_evidence311
from rosevear_ai_hub.master_shell_acceptance312 import reconcile_master_evidence312
from rosevear_ai_hub.master_shell_acceptance313 import reconcile_master_evidence313
from rosevear_ai_hub.master_shell_acceptance314 import reconcile_master_evidence314
from rosevear_ai_hub.master_shell_acceptance315 import reconcile_master_evidence315
from rosevear_ai_hub.master_shell_acceptance316 import reconcile_master_evidence316
from rosevear_ai_hub.master_shell_monitor304 import PersistentReeMonitor304
from rosevear_ai_hub.master_shell_uptime303 import LocalUptimeSampler303
from rosevear_ai_hub.release_observability import collect_release_observability
from rosevear_ai_hub.resource_budget import collect_resource_snapshot
from rosevear_ai_hub.windows_launcher_evidence286 import collect_windows_launcher_evidence
from rosevear_ai_hub.windows_runtime_evidence285 import collect_windows_runtime_evidence

router = APIRouter(prefix="/api/v1/system", tags=["system"])


@router.get("/master-shell-316-acceptance")
def master_shell_316_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Protected, read-only no-store source HOLD view; no live evidence import."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence316(monitor)


@router.get("/master-shell-315-acceptance")
def master_shell_315_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only no-store source HOLD projection, never a signer enrollment API."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence315(monitor)


@router.get("/master-shell-314-acceptance")
def master_shell_314_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only no-store status, no protected evidence intake or activation."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence314(monitor)


@router.get("/master-shell-313-acceptance")
def master_shell_313_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only, private no-store read; no signed evidence is imported here."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence313(monitor)


@router.get("/master-shell-312-acceptance")
def master_shell_312_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only source evidence gaps; no pilot admission or state change."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence312(monitor)


@router.get("/master-shell-311-acceptance")
def master_shell_311_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Read-only, owner-scoped source status; no evidence import or command."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence311(monitor)


@router.get("/master-shell-310-acceptance")
def master_shell_310_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only no-store, no protected evidence intake or transport."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence310(monitor)


@router.get("/master-shell-309-acceptance")
def master_shell_309_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only no-store source projection; no protected evidence import."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence309(monitor)


@router.get("/master-shell-308-acceptance")
def master_shell_308_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only, no-store contract projection. No receiver or evidence import."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence308(monitor)


@router.get("/master-shell-307-acceptance")
def master_shell_307_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Read-only host/custody projection; no remote proof or transport writes."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_master_evidence307(monitor)


@router.get("/master-shell-306-acceptance")
def master_shell_306_acceptance(request: Request, response: Response) -> dict[str, object]:
    """Owner-only read of existing original-host trends and missing import gates.

    Protected owner-signed reviews must be imported through a separately
    authenticated, locally approved adapter; this GET never accepts writes.
    """
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    return reconcile_three_master_uptime306(monitor)


@router.get("/master-shell-305-readiness")
def master_shell_305_readiness(request: Request, response: Response) -> dict[str, object]:
    """Owner-only, local, manual reconciliation. Never authenticates the receiver."""
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    release = inspect_original_release305(Path.cwd(), monitor)
    return {
        "schema": "rosevear.ai-hub.master360-acceptance-305.v1",
        "sourceId": "rosevear-ai-hub",
        "sourceBuild": 305,
        "controller": "ai-data-platform",
        "controllerBuild": 360,
        "controllerMainAtReconciliation": "4b45b435fa7b6fc83b94e31556648fe4190a9f53",
        "commsQl411RevisionAtReconciliation": "e8ec7853133725bbdf51893548a20cac67ebfbed",
        "commsQl412": "HOLD_CONTRACT_NOT_YET_ON_COMMS_MAIN",
        "installedRelease": release,
        "durableMonitoring": monitor.persistent_snapshot304(),
        "oneTest": "HOLD_OWNER_APPROVED_PROTECTED_SOURCE_SIGNATURE_NOT_EXECUTED",
        "commsAck": "HOLD_INDEPENDENT_RECEIVER_SIGNATURE_NOT_VERIFIED",
        "automationHost": "REE_ORIGINAL_WINDOWS_ONLY",
        "newWindowsScheduledTasks": 0,
        "connection": "HOLD",
        "slaveGate": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
    }


@router.get("/master-shell-local-uptime")
def master_shell_local_uptime(request: Request, response: Response) -> dict[str, object]:
    """Owner-only loopback observations; neither signed evidence nor a Shell GET."""
    response.headers["Cache-Control"] = "no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, LocalUptimeSampler303):
        # Test/client lifespan not started: never claim monitoring was enabled.
        monitor = LocalUptimeSampler303(enabled=False)
    return monitor.snapshot()


@router.get("/master-shell-reconciliation")
def master_shell_reconciliation304(request: Request, response: Response) -> dict[str, object]:
    """Owner-only durable monitor and unsent Comms incident candidates.

    Never substitute browser headers or an unsigned sample for original-host
    owner consent, signer enrollment, or a receiver-signed acknowledgment.
    """
    response.headers["Cache-Control"] = "private, no-store"
    monitor = getattr(request.app.state, "master_shell_uptime303", None)
    if not isinstance(monitor, PersistentReeMonitor304):
        monitor = PersistentReeMonitor304(enabled=False)
    snapshot = monitor.persistent_snapshot304()
    # Do not generate a purported source-revision-bound incident until a
    # separate original-host installed revision has been independently pinned.
    return {
        "schema": "rosevear.ai-hub.master360-activation-status.v1",
        "controller": "ai-data-platform",
        "controllerBuild": 360,
        "sourceId": "rosevear-ai-hub",
        "sourceRole": "SOURCE",
        "monitoring": snapshot,
        "signedTelemetry": "HOLD_ORIGINAL_SIGNER_AND_OWNER_AUTHORIZATION_REQUIRED",
        "commsIncidentHandoff": "HOLD_RECEIVER_ACK_NOT_INDEPENDENTLY_VERIFIED",
        # Actual source-revision binding is deliberately not guessed from GitHub
        # and requires separate original-host installed-release verification.
        "sourceRevisionBoundIncidents": "HOLD_INSTALLED_SOURCE_REVISION_NOT_PINNED",
        "slaveStage": "HOLD_NEXT_MASTER_INTEGRATION_STAGE",
        "newWindowsScheduledTasks": 0,
        "connections": {"ai-data-platform": "HOLD", "rosevear-comms-hub": "HOLD"},
    }


@router.get("/resource-budget")
def resource_budget(response: Response) -> dict[str, object]:
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_resource_snapshot()
    except (OSError, RuntimeError) as exc:
        # No machine paths, access tokens, or OS-level exception details returned.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resource metrics are temporarily unavailable.",
        ) from exc


@router.get("/release-observability")
def release_observability(response: Response) -> dict[str, object]:
    """Owner-only, explicit-read local updater metadata; no secret values."""
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_release_observability(Path.cwd())
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Release evidence is temporarily unavailable.",
        ) from exc


@router.get("/windows-runtime-evidence")
def windows_runtime_evidence(response: Response) -> dict[str, object]:
    """Owner-only, on-demand host observation; never a machine attestation."""
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_windows_runtime_evidence(Path.cwd())
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Windows runtime evidence is temporarily unavailable.",
        ) from exc


@router.get("/windows-launcher-evidence")
def windows_launcher_evidence(response: Response) -> dict[str, object]:
    """Owner-only, explicit-read candidate and launcher evidence; no control."""
    response.headers["Cache-Control"] = "no-store"
    try:
        return collect_windows_launcher_evidence(Path.cwd())
    except (OSError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Windows launcher evidence is temporarily unavailable.",
        ) from exc
