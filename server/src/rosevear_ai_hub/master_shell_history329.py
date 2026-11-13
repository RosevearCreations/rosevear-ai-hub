"""Build 329: exact protected QL-431–437 predecessor custody revalidation.

The caller must supply original-host journals and historical decisions. This module
does not fetch data from browsers, issue receiver commands or infer live OFF.
"""

from typing import Any

from rosevear_ai_hub.master_shell_acceptance319 import _digest
from rosevear_ai_hub.master_shell_acceptance328 import (
    ProtectedClosureJournal328,
)
from rosevear_ai_hub.master_shell_acceptance328 import _prior as ql431_436_prior


class ProtectedHistoricalChain329:
    """Native chain reader, not a status-only or boolean attestation adapter."""

    def __init__(
        self,
        *,
        scope: dict[str, Any],
        ql432: dict[str, Any],
        ql433: dict[str, Any],
        ql434: dict[str, Any],
        ql435: dict[str, Any],
        ql436: dict[str, Any],
        incident_journal: Any,
        review_journal: Any,
        precheck_journal: Any,
        readiness_journal: Any,
        pilot_evidence_journal: Any,
        shutdown_journal: Any,
        closure_journal: ProtectedClosureJournal328,
    ):
        self.scope = scope
        self.ql432 = ql432
        self.ql433 = ql433
        self.ql434 = ql434
        self.ql435 = ql435
        self.ql436 = ql436
        self.incident_journal = incident_journal
        self.review_journal = review_journal
        self.precheck_journal = precheck_journal
        self.readiness_journal = readiness_journal
        self.pilot_evidence_journal = pilot_evidence_journal
        self.shutdown_journal = shutdown_journal
        self.closure_journal = closure_journal

    def read(self, monitor: Any, ql437: Any, request: Any) -> str | None:
        """Digest exact original journals and their verified native predecessor chain.

        Must run both before QL-438 PENDING and again before CLOSED.
        """
        if not (
            isinstance(ql437, dict)
            and isinstance(request, dict)
            and isinstance(self.scope, dict)
            and self.scope.get("sourceId") == "rosevear-ai-hub"
            and self.scope.get("sourceRevision") == request.get("sourceRevision")
            and self.scope.get("controllerRevision") == request.get("controllerRevision")
            and isinstance(self.ql435, dict)
            and isinstance(self.ql436, dict)
            and isinstance(self.closure_journal, ProtectedClosureJournal328)
            and self.ql435.get("incidentId") == ql437.get("originalIncidentId")
            and self.ql436.get("originalIncidentId") == ql437.get("originalIncidentId")
            and self.ql436.get("leaseDisposition") == ql437.get("leaseDisposition")
            and self.ql436.get("nextCeremonyId") == ql437.get("nextCeremonyId")
            and self.ql436.get("leaseExceptionEscalationRequired") is True
        ):
            return None
        native = ql431_436_prior(
            monitor,
            self.scope,
            self.ql432,
            self.ql433,
            self.ql434,
            self.ql435,
            self.ql436,
            self.incident_journal,
            self.review_journal,
            self.precheck_journal,
            self.readiness_journal,
            self.pilot_evidence_journal,
            self.shutdown_journal,
        )
        if not native:
            return None
        incident = ql437["originalIncidentId"]
        pending = self.closure_journal.read(monitor, incident, "PENDING")
        final = self.closure_journal.read(monitor, incident, "FINAL")
        if not (
            pending
            and final
            and pending["exportDigest"] == final["exportDigest"]
            and final["receiptDigest"] == ql437.get("finalReceiptDigest")
        ):
            return None
        return _digest(
            {
                "scope": self.scope,
                "verifiedQl431To436": native,
                "ql437Pending": pending,
                "ql437Final": final,
                "incident": incident,
                "leaseDisposition": ql437["leaseDisposition"],
            }
        )
