"""Automation run history and restart-safe failure recovery for Build 029."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from rosevear_ai_hub.audit import record_audit_event
from rosevear_ai_hub.models import Automation, AutomationRun

AUTOMATION_RUN_STATUSES = ("running", "success", "failed", "skipped", "interrupted")
AUTOMATION_FAILURE_STATUSES = ("failed", "interrupted")
NO_AUTOMATIC_RETRY_REASON = (
    "Automation actions are not retried automatically because a failed or interrupted "
    "physical-world action may have partially completed."
)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def recover_interrupted_automation_runs(session: Session) -> int:
    """Close orphaned running rows after restart without replaying any physical action."""

    rows = session.scalars(
        select(AutomationRun)
        .where(AutomationRun.status == "running")
        .order_by(AutomationRun.id.asc())
    ).all()
    if not rows:
        return 0

    names = {
        row.id: name
        for row, name in session.execute(
            select(AutomationRun, Automation.name)
            .join(Automation, AutomationRun.automation_id == Automation.id)
            .where(AutomationRun.id.in_([item.id for item in rows]))
        ).all()
    }

    now = _utc_now()
    for run in rows:
        previous = dict(run.result_summary or {}) if isinstance(run.result_summary, dict) else {}
        actions_completed = previous.get("actions_completed", 0)
        if not isinstance(actions_completed, int):
            actions_completed = 0
        run.status = "interrupted"
        run.completed_at = now
        run.result_summary = {
            **previous,
            "actions_completed": actions_completed,
            "failure_kind": "runtime_restart",
            "error": "Hub restarted before this automation run completed.",
            "automatic_retry": False,
            "retry_guidance": NO_AUTOMATIC_RETRY_REASON,
            "partial_execution_possible": True,
        }
        record_audit_event(
            session,
            actor_user_id=None,
            event_type="automation.run.interrupted",
            object_type="automation",
            object_id=str(run.automation_id),
            action="recover",
            arguments={
                "name": names.get(run.id, f"automation-{run.automation_id}"),
                "run_id": run.id,
            },
            result={
                "ok": False,
                "run_id": run.id,
                "status": "interrupted",
                "automatic_retry": False,
            },
        )

    session.commit()
    return len(rows)


def public_run_summary(value: Any) -> dict[str, Any]:
    """Return the already-bounded Event Engine evidence as a plain mapping."""

    return dict(value) if isinstance(value, dict) else {}
