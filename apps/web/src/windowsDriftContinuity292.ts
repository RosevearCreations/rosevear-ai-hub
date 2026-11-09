import type { RecoveryHistoryEntry291 } from "./windowsRecoveryDecision291";

/** A browser-session comparison, never an original-Windows attestation. */
export type DriftEpisode292 = Readonly<{
  firstObservedUtc: string;
  lastObservedUtc: string;
  observationCount: number;
  sourceSha: string | null;
  disposition: RecoveryHistoryEntry291["reportedDisposition"];
  status: "REPORTED_DRIFT_UNVERIFIED" | "EVIDENCE_HOLD" | "REPORTED_ALIGNMENT_UNVERIFIED";
}>;

export const SIGNED_RECEIPT_PREREQUISITES_292 = [
  "Independent observation on the original Windows host, not a browser-entered source SHA",
  "Installed executable and launcher/process ancestry verified on that same host",
  "Approved original issuer enrollment verified independently",
  "Independent witness identity and scope verified",
  "Explicit signed owner consent tied to the specific release and host",
  "Signature, canonical payload, freshness and replay protection verified",
  "Explicit Master Shell publisher and receiver authorization verified",
] as const;

export function compareRecoveryHistory292(entries: readonly RecoveryHistoryEntry291[]) {
  const safe = entries.slice(-20).filter(entry =>
    Number.isFinite(Date.parse(entry.recordedAtUtc)) &&
    entry.evidenceStatus === "OWNER_NOTED_UNVERIFIED" &&
    entry.originalHostAccepted === false &&
    entry.signedReceiptVerified === false &&
    entry.masterShellAuthorized === false
  );
  const chronological = [...safe].sort((a, b) =>
    Date.parse(a.recordedAtUtc) - Date.parse(b.recordedAtUtc));
  const episodes: DriftEpisode292[] = [];
  for (const entry of chronological) {
    const status: DriftEpisode292["status"] =
      entry.reportedDisposition === "REPORTED_DRIFT_NEEDS_REVIEW"
        ? "REPORTED_DRIFT_UNVERIFIED"
        : entry.reportedDisposition === "REPORTED_CANDIDATES_CONVERGE_UNVERIFIED"
          ? "REPORTED_ALIGNMENT_UNVERIFIED" : "EVIDENCE_HOLD";
    const previous = episodes[episodes.length - 1];
    // Consecutive comparable observations form a reported episode only; no
    // time-based 'resolved' or acceptance claim is ever inferred.
    if (previous && previous.sourceSha === entry.ownerMainSha &&
      previous.status === status && previous.disposition === entry.reportedDisposition) {
      episodes[episodes.length - 1] = {
        ...previous, lastObservedUtc: entry.recordedAtUtc,
        observationCount: previous.observationCount + 1,
      };
    } else {
      episodes.push({
        firstObservedUtc: entry.recordedAtUtc, lastObservedUtc: entry.recordedAtUtc,
        observationCount: 1, sourceSha: entry.ownerMainSha,
        disposition: entry.reportedDisposition, status,
      });
    }
  }
  const changes = episodes.slice(1).map((current, index) => ({
    from: episodes[index].status, to: current.status,
    atUtc: current.firstObservedUtc,
    interpretation: "REPORTED_TRANSITION_ONLY_NOT_VERIFIED_CLOSURE" as const,
  }));
  return {
    schema: "rosevear.ai-hub.windows-drift-comparison.v1" as const,
    source: "BROWSER_SESSION_OWNER_NOTES_ONLY" as const,
    comparedObservations: safe.length,
    episodes,
    transitions: changes,
    independentlyVerifiedReceipts: 0 as const,
    originalHostAcceptance: "HOLD_UNVERIFIED" as const,
    signedReceiptIntake: "PREREQUISITES_ONLY_HOLD" as const,
    masterShellAuthorization: "HOLD_UNVERIFIED" as const,
  };
}
