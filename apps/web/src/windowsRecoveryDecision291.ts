import type { WindowsAdoptionReview290 } from "./windowsFieldAdoption290";

/** Owner choices are notes for supervised follow-up, not executable commands. */
export type RecoveryDecision291 =
  | "DEFER_ON_HOLD"
  | "REFRESH_READ_ONLY_EVIDENCE"
  | "INSPECT_ORIGINAL_WINDOWS_HOST"
  | "REVIEW_SUPERVISED_RECOVERY";

export type RecoveryHistoryEntry291 = Readonly<{
  recordedAtUtc: string;
  decision: RecoveryDecision291;
  reportedDisposition: WindowsAdoptionReview290["disposition"];
  reportedBackendVersionState: WindowsAdoptionReview290["backendVersionState"];
  reportedCandidateMatches: number;
  ownerMainSha: string | null;
  evidenceStatus: "OWNER_NOTED_UNVERIFIED";
  originalHostAccepted: false;
  signedReceiptVerified: false;
  masterShellAuthorized: false;
}>;

export type RecoveryGuidance291 = Readonly<{
  priority: "EVIDENCE_HOLD" | "DRIFT_FOLLOW_UP" | "LAUNCHER_REVIEW" | "UNVERIFIED_ALIGNMENT";
  summary: string;
  versionFollowUp: string;
  steps: readonly string[];
  supervisedRecoveryReviewAvailable: boolean;
}>;

const SHA40 = /^[a-f0-9]{40}$/;
const VALID_DECISIONS: readonly RecoveryDecision291[] = [
  "DEFER_ON_HOLD",
  "REFRESH_READ_ONLY_EVIDENCE",
  "INSPECT_ORIGINAL_WINDOWS_HOST",
  "REVIEW_SUPERVISED_RECOVERY",
];

export const RECOVERY_DECISION_LABELS_291: Readonly<Record<RecoveryDecision291, string>> = {
  DEFER_ON_HOLD: "Keep on HOLD and defer any recovery",
  REFRESH_READ_ONLY_EVIDENCE: "Request fresh read-only release evidence",
  INSPECT_ORIGINAL_WINDOWS_HOST: "Plan a supervised original Windows host inspection",
  REVIEW_SUPERVISED_RECOVERY: "Review the existing supervised recovery or rollback procedure",
};

export function guideWindowsRecovery291(review: WindowsAdoptionReview290): RecoveryGuidance291 {
  const versionFollowUp =
    review.backendVersionState === "VERSION_DISAGREEMENT"
      ? "Backend package versions disagree: check which proxy and responding process were read, then take fresh local evidence."
      : review.backendVersionState === "NOT_COMPARABLE"
        ? "Backend package versions cannot be compared: collect fresh Build 113 and Build 285 readbacks."
        : "Reported backend package versions agree, but do not prove an installed executable or Git commit.";
  const common = "Keep installed-host identity, independent witness, owner consent, signed receipt and Master Shell authorization on HOLD.";
  if (review.disposition === "HOLD_MISSING_OR_STALE_EVIDENCE") {
    return { priority: "EVIDENCE_HOLD",
      summary: "The source reference or local observations are missing, stale or invalid.",
      versionFollowUp, supervisedRecoveryReviewAvailable: false,
      steps: [
        "Recheck the protected main commit and successful production workflow in GitHub.",
        "Explicitly refresh Build 113 and then Builds 285/286 on the intended Windows host.",
        common,
      ] };
  }
  if (review.disposition === "REPORTED_DRIFT_NEEDS_REVIEW") {
    return { priority: "DRIFT_FOLLOW_UP",
      summary: "Reported release pointers, launcher candidates, package versions or updater state disagree.",
      versionFollowUp, supervisedRecoveryReviewAvailable: true,
      steps: [
        "Inspect the original updater journal, startup task and responding process without changing services.",
        "Compare the prior known-good installation with the current source reference.",
        "Read the existing supervised recovery and rollback guide before considering any manual action.",
        common,
      ] };
  }
  if (review.disposition === "HOLD_INCOMPLETE_CANDIDATES") {
    return { priority: "LAUNCHER_REVIEW",
      summary: "Candidate evidence is incomplete or the responding process ancestry is not established.",
      versionFollowUp, supervisedRecoveryReviewAvailable: false,
      steps: [
        "Review Build 286 launcher ancestry and missing listener evidence on the original Windows machine.",
        "Repeat the read-only checks after the missing local evidence is available.",
        common,
      ] };
  }
  return { priority: "UNVERIFIED_ALIGNMENT",
    summary: "Five reported candidates align, but neither the original host nor installed executable is independently attested.",
    versionFollowUp, supervisedRecoveryReviewAvailable: false,
    steps: [
      "Perform the separate, supervised Build 287 original-host acceptance review.",
      "Request independently authorized signer, witness and owner-consent evidence if trust is later required.",
      common,
    ] };
}

/** Refuse an action record without explicit acknowledgement or valid current observation.
 * No entry grants permission to restart, install, sign or publish anything. */
export function recordRecoveryDecision291(
  review: WindowsAdoptionReview290,
  decision: RecoveryDecision291,
  ownerAcknowledged: boolean,
  expectedMainSha: string,
  recordedAtMs: number,
): RecoveryHistoryEntry291 | null {
  if (!ownerAcknowledged || !VALID_DECISIONS.includes(decision) ||
      !Number.isSafeInteger(recordedAtMs) || recordedAtMs < 0) return null;
  const sha = expectedMainSha.trim().toLowerCase();
  const validReference = review.referenceState === "OWNER_ENTERED_UNVERIFIED" && SHA40.test(sha);
  if (decision === "REVIEW_SUPERVISED_RECOVERY" &&
      (!validReference || !guideWindowsRecovery291(review).supervisedRecoveryReviewAvailable)) return null;
  return {
    recordedAtUtc: new Date(recordedAtMs).toISOString(), decision,
    reportedDisposition: review.disposition,
    reportedBackendVersionState: review.backendVersionState,
    reportedCandidateMatches: review.matchCount,
    ownerMainSha: validReference ? sha : null,
    evidenceStatus: "OWNER_NOTED_UNVERIFIED",
    originalHostAccepted: false, signedReceiptVerified: false, masterShellAuthorized: false,
  };
}

export function exportRecoveryHistory291(history: readonly RecoveryHistoryEntry291[]) {
  return {
    schema: "rosevear.ai-hub.windows-recovery-owner-history.v1",
    source: "BROWSER_SESSION_OWNER_NOTES_ONLY",
    originalHostAcceptance: "HOLD_UNVERIFIED",
    signedReceipt: "HOLD_UNVERIFIED",
    masterShellAuthorization: "HOLD_UNVERIFIED",
    entries: history.slice(-20),
  } as const;
}
