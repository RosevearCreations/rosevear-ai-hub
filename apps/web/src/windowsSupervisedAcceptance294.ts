import type { IntakeNote293 } from "./windowsEvidenceIntake293";
import { RECEIPT_VERIFICATION_GATES_293 } from "./windowsEvidenceIntake293";

/** Independent acceptance design: no signed receipt or trust registry is available here. */
export type SupervisedAction294 =
  | "REVIEW_ORIGINAL_HOST" | "MAP_SIGNER_WITNESS" | "REVIEW_REPLAY_SAFETY";
export type SupervisedReview294 = Readonly<{
  reviewedAtUtc: string;
  action: SupervisedAction294;
  expectedMainSha: string;
  linkedIntakeCount: number;
  evidenceMapping: readonly { id: string; authority: string; reviewState: "INDEPENDENT_REVIEW_REQUIRED" }[];
  ownerAcknowledgement: "LOCAL_NON_AUTHORIZING_ACKNOWLEDGEMENT";
  originalHostAccepted: false;
  signerWitnessVerified: false;
  receiptVerified: false;
  masterShellAuthorized: false;
}>;

const SHA40 = /^[a-f0-9]{40}$/;
const ACTIONS: readonly SupervisedAction294[] = [
  "REVIEW_ORIGINAL_HOST", "MAP_SIGNER_WITNESS", "REVIEW_REPLAY_SAFETY",
];

/** Fail closed: only previously locally reviewed, unverified Build 293 notes qualify.
 * A valid note remains a self-reported source candidate, not physical host evidence.
 */
export function recordSupervisedReview294(input: {
  notes: readonly IntakeNote293[];
  expectedMainSha: string;
  acknowledged: boolean;
  action: SupervisedAction294;
  nowMs: number;
}): SupervisedReview294 | null {
  const { notes, acknowledged, action, nowMs } = input;
  const sha = input.expectedMainSha.trim().toLowerCase();
  if (!acknowledged || !ACTIONS.includes(action) || !SHA40.test(sha) ||
      !Number.isSafeInteger(nowMs) || nowMs < 0) return null;
  const eligible = notes.slice(-10).filter(note =>
    note.source === "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED" &&
    note.expectedMainSha === sha &&
    /^[a-f0-9]{64}$/.test(note.digest) &&
    note.independentlyVerifiedGateCount === 0 &&
    note.originalHostAcceptance === "HOLD_UNVERIFIED" &&
    note.receiptVerification === "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED" &&
    note.masterShellAuthorization === "HOLD_UNVERIFIED" &&
    Number.isFinite(Date.parse(note.reviewedAtUtc)) &&
    Date.parse(note.reviewedAtUtc) <= nowMs + 60_000
  );
  if (!eligible.length) return null;
  return {
    reviewedAtUtc: new Date(nowMs).toISOString(),
    action, expectedMainSha: sha, linkedIntakeCount: eligible.length,
    evidenceMapping: RECEIPT_VERIFICATION_GATES_293.map(gate => ({
      id: gate.id, authority: gate.authority,
      reviewState: "INDEPENDENT_REVIEW_REQUIRED" as const,
    })),
    ownerAcknowledgement: "LOCAL_NON_AUTHORIZING_ACKNOWLEDGEMENT",
    originalHostAccepted: false, signerWitnessVerified: false,
    receiptVerified: false, masterShellAuthorized: false,
  };
}

/** Synthetic replay filter TEST HARNESS ONLY: no real keys, signature, registry or transport.
 * A fresh-looking synthetic envelope is never a valid, accepted signed receipt.
 */
export type SyntheticReceipt294 = Readonly<{
  eventId: string; nonce: string; digest: string;
  issuedAtMs: number; expiresAtMs: number;
  audience: string; sourceId: string;
}>;
export type ReplayVerdict294 =
  | "SIMULATED_FRESH_UNVERIFIED"
  | "WOULD_BLOCK_MALFORMED" | "WOULD_BLOCK_SOURCE_OR_AUDIENCE"
  | "WOULD_BLOCK_TIME_WINDOW" | "WOULD_BLOCK_REPLAY"
  | "WOULD_BLOCK_EVENT_COLLISION" | "WOULD_BLOCK_NONCE_REUSE";

const HEX64 = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[a-z0-9-]{1,64}$/;

export function checkSyntheticReplay294(
  candidate: SyntheticReceipt294, previous: readonly SyntheticReceipt294[], nowMs: number,
): ReplayVerdict294 {
  if (!SAFE_ID.test(candidate.eventId) || !SAFE_ID.test(candidate.nonce) ||
      !HEX64.test(candidate.digest) || !Number.isSafeInteger(nowMs) ||
      !Number.isSafeInteger(candidate.issuedAtMs) || !Number.isSafeInteger(candidate.expiresAtMs)) {
    return "WOULD_BLOCK_MALFORMED";
  }
  if (candidate.audience !== "ai-data-platform" || candidate.sourceId !== "rosevear-ai-hub")
    return "WOULD_BLOCK_SOURCE_OR_AUDIENCE";
  if (candidate.expiresAtMs <= candidate.issuedAtMs ||
      candidate.expiresAtMs - candidate.issuedAtMs > 5 * 60_000 ||
      candidate.issuedAtMs > nowMs + 60_000 || candidate.expiresAtMs <= nowMs)
    return "WOULD_BLOCK_TIME_WINDOW";
  const sameEvent = previous.find(item => item.eventId === candidate.eventId);
  if (sameEvent) return sameEvent.digest === candidate.digest && sameEvent.nonce === candidate.nonce
    ? "WOULD_BLOCK_REPLAY" : "WOULD_BLOCK_EVENT_COLLISION";
  if (previous.some(item => item.nonce === candidate.nonce)) return "WOULD_BLOCK_NONCE_REUSE";
  return "SIMULATED_FRESH_UNVERIFIED";
}

export function runSyntheticReplayHarness294(nowMs: number) {
  const base: SyntheticReceipt294 = {
    eventId: "demo-event-1", nonce: "demo-nonce-1", digest: "a".repeat(64),
    issuedAtMs: nowMs - 30_000, expiresAtMs: nowMs + 60_000,
    audience: "ai-data-platform", sourceId: "rosevear-ai-hub",
  };
  const cases = [
    { label: "Unseen synthetic envelope", candidate: base, seen: [] },
    { label: "Exact replay", candidate: base, seen: [base] },
    { label: "Same event ID, changed content", candidate: { ...base, digest: "b".repeat(64) }, seen: [base] },
    { label: "Reused nonce", candidate: { ...base, eventId: "demo-event-2" }, seen: [base] },
    { label: "Expired window", candidate: { ...base, issuedAtMs: nowMs - 120_000, expiresAtMs: nowMs - 1000 }, seen: [] },
    { label: "Future-dated evidence", candidate: { ...base, issuedAtMs: nowMs + 120_000, expiresAtMs: nowMs + 180_000 }, seen: [] },
    { label: "Wrong audience", candidate: { ...base, audience: "other-destination" }, seen: [] },
    { label: "Wrong source", candidate: { ...base, sourceId: "other-source" }, seen: [] },
  ] as const;
  return {
    source: "SYNTHETIC_OFFLINE_REPLAY_TEST_ONLY" as const,
    results: cases.map(item => ({
      scenario: item.label,
      verdict: checkSyntheticReplay294(item.candidate, item.seen, nowMs),
    })),
    verifiedSignatures: 0 as const,
    productionReceiptsAccepted: 0 as const,
    independentHostAcceptance: "HOLD_UNVERIFIED" as const,
  };
}
