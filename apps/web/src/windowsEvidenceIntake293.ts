import type { OfflineHandoffReview289 } from "./windowsOfflineHandoffReview289";
import type { DriftEpisode292 } from "./windowsDriftContinuity292";

/**
 * Build 293 is an offline intake REVIEW of a previously checksum-checked,
 * UNSIGNED Build 288 request. It never authenticates a host, signer or receipt.
 */
export const RECEIPT_VERIFICATION_GATES_293 = [
  { id: "original_host", authority: "Original Windows host + independent observer",
    requirement: "Attest physical host identity and independent inspection of the running process" },
  { id: "installed_binary", authority: "Independent installed-release reviewer",
    requirement: "Bind installed executable hash, launcher ancestry and source revision to the observed machine" },
  { id: "issuer", authority: "Approved issuer registry",
    requirement: "Validate an enrolled signer key, identity, scope and revocation state independently" },
  { id: "witness", authority: "Independent witness",
    requirement: "Verify witness identity, separation of duties and exact evidence scope" },
  { id: "owner_consent", authority: "Owner",
    requirement: "Verify signed, current owner consent for the exact release, host and intended publication" },
  { id: "receipt_crypto", authority: "Approved receipt verifier",
    requirement: "Verify canonical signed bytes, cryptographic signature, expiration, replay and audience binding" },
  { id: "shell_publisher", authority: "Master Shell source registry and receiver",
    requirement: "Verify publisher registration, contract permissions and authorized destination intake" },
] as const;

export type IntakeCrossReference293 =
  "MISSING_CANDIDATES" | "REPORTED_CANDIDATE_DRIFT" |
  "SOURCE_MISMATCH" | "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED";
export type IntakeNote293 = Readonly<{
  reviewedAtUtc: string;
  source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED";
  digest: string;
  reportedReleaseSha: string | null;
  reportedCheckoutSha: string | null;
  expectedMainSha: string;
  crossReference: IntakeCrossReference293;
  relatedEpisodeCount: number;
  historicalSample: boolean;
  ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY";
  originalHostAcceptance: "HOLD_UNVERIFIED";
  receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED";
  masterShellAuthorization: "HOLD_UNVERIFIED";
  independentlyVerifiedGateCount: 0;
}>;

export type IntakeDecision293 =
  | { state: "REJECTED"; reason: "OWNER_ACKNOWLEDGEMENT_REQUIRED" |
      "UNSAFE_UNSIGNED_HANDOFF" | "INVALID_SOURCE_OR_CLOCK" | "INVALID_SAMPLE_TIME" }
  | { state: "LOCAL_REVIEW_ON_HOLD"; note: IntakeNote293 };

const SHA40 = /^[a-f0-9]{40}$/;

/**
 * Each selected file must first pass Build 289's strict layout/digest checks.
 * Operator acknowledgement is required at RECORD time, not just on file import.
 * Build 292 episode matching is a source-pointer cross-reference, not proof.
 */
export function reviewOriginalWindowsIntake293(input: {
  handoff: OfflineHandoffReview289 | null;
  episodes: readonly DriftEpisode292[];
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}): IntakeDecision293 {
  const { handoff, episodes, expectedMainSha, acknowledged, nowMs } = input;
  if (!acknowledged) return { state: "REJECTED", reason: "OWNER_ACKNOWLEDGEMENT_REQUIRED" };
  if (!handoff || handoff.state !== "DIGEST_MATCH_UNVERIFIED") {
    return { state: "REJECTED", reason: "UNSAFE_UNSIGNED_HANDOFF" };
  }
  const source = expectedMainSha.trim().toLowerCase();
  if (!SHA40.test(source) || !Number.isSafeInteger(nowMs) || nowMs < 0) {
    return { state: "REJECTED", reason: "INVALID_SOURCE_OR_CLOCK" };
  }
  const sampledMs = Date.parse(handoff.sampleAt);
  if (!Number.isFinite(sampledMs) || sampledMs > nowMs + 60_000) {
    return { state: "REJECTED", reason: "INVALID_SAMPLE_TIME" };
  }
  const release = handoff.releaseCandidate;
  const checkout = handoff.checkoutCandidate;
  const crossReference: IntakeCrossReference293 =
    !release && !checkout ? "MISSING_CANDIDATES" :
    release && checkout && release !== checkout ? "REPORTED_CANDIDATE_DRIFT" :
    (release ?? checkout) !== source ? "SOURCE_MISMATCH" :
    "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED";
  // Episode references always remain unverified browser session owner notes.
  const episodeCount = episodes.filter(episode =>
    episode.sourceSha === source &&
    (release === source || checkout === source) &&
    episode.observationCount > 0
  ).length;
  return { state: "LOCAL_REVIEW_ON_HOLD", note: {
    reviewedAtUtc: new Date(nowMs).toISOString(),
    source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED",
    digest: handoff.digest,
    reportedReleaseSha: release,
    reportedCheckoutSha: checkout,
    expectedMainSha: source,
    crossReference,
    relatedEpisodeCount: episodeCount,
    historicalSample: nowMs - sampledMs > 5 * 60_000,
    ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY",
    originalHostAcceptance: "HOLD_UNVERIFIED",
    receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED",
    masterShellAuthorization: "HOLD_UNVERIFIED",
    independentlyVerifiedGateCount: 0,
  }};
}

export function exportIntakeReview293(notes: readonly IntakeNote293[]) {
  return {
    schema: "rosevear.ai-hub.original-windows-intake-review.v1" as const,
    source: "BROWSER_SESSION_OWNER_REVIEW_ONLY" as const,
    independentlyVerifiedGateCount: 0 as const,
    originalHostAcceptance: "HOLD_UNVERIFIED" as const,
    signedReceiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED" as const,
    masterShellAuthorization: "HOLD_UNVERIFIED" as const,
    notes: notes.slice(-10),
  };
}
