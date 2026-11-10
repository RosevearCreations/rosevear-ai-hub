import { inspectFieldPacket298 } from "./windowsReceiptReview298";

const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const REF = /^[A-Z0-9][A-Z0-9_-]{3,63}$/;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const REVIEWER_FIELDS = ["schema", "sourceId", "sourceSha", "custodyDigestClaim",
  "reviewerReference", "reviewedAtUtc", "evidenceOrigin", "independentIdentityState",
  "signatureState", "originalHostState", "ownerConsentState"];
export type ProvenanceIssue299 = "PACKET_NOT_REVIEWABLE" | "REVIEWER_CANDIDATE_MISSING" |
  "REVIEWER_SCHEMA_INVALID" | "SOURCE_REVISION_MISMATCH" | "CUSTODY_DIGEST_MISMATCH" |
  "REVIEWER_CHRONOLOGY_INVALID" | "REVIEWER_STALE" | "ORIGINAL_PROOF_UNVERIFIED";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}
function time(value: unknown): number | null {
  if (typeof value !== "string" || !ISO.test(value)) return null;
  const n = Date.parse(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Metadata correlation only. This function deliberately has no signature verifier. */
export function reconcileOriginalProvenance299(input: {
  packetRaw: string;
  reviewerRaw: string;
  expectedMainSha: string;
  nowMs: number;
}) {
  const packetReview = inspectFieldPacket298(
    input.packetRaw, input.expectedMainSha, input.nowMs);
  const result = (issues: ProvenanceIssue299[], reference: string | null = null) => ({
    schema: "rosevear.ai-hub.original-host-provenance-review.v1" as const,
    sourceId: "rosevear-ai-hub" as const,
    expectedMainSha: SHA40.test(input.expectedMainSha) ? input.expectedMainSha : null,
    packetState: packetReview.state,
    packetIssues: packetReview.issues,
    reviewerReference: reference,
    state: issues.length === 1 && issues[0] === "ORIGINAL_PROOF_UNVERIFIED"
      ? "CANDIDATE_CORRELATED_HOLD" as const : "REVIEW_EXCEPTION_HOLD" as const,
    issues,
    originalHostAuthenticated: false as const,
    independentReviewerAuthenticated: false as const,
    signedReceiptVerified: false as const,
    signedOwnerConsentVerified: false as const,
    shellConnection: "HOLD" as const,
    messagesSent: 0 as const,
  });
  if (packetReview.state !== "REVIEW_ONLY_HOLD" ||
      packetReview.issues.includes("SOURCE_REVISION_DRIFT") ||
      packetReview.issues.includes("PACKET_STALE")) return result(["PACKET_NOT_REVIEWABLE"]);
  if (!input.reviewerRaw.trim()) return result(["REVIEWER_CANDIDATE_MISSING"]);
  if (input.reviewerRaw.length > 4096) return result(["REVIEWER_SCHEMA_INVALID"]);
  let reviewer: unknown;
  let packet: unknown;
  try { reviewer = JSON.parse(input.reviewerRaw); packet = JSON.parse(input.packetRaw); }
  catch { return result(["REVIEWER_SCHEMA_INVALID"]); }
  if (!exact(reviewer, REVIEWER_FIELDS) || !object(packet) ||
      reviewer.schema !== "rosevear.ai-hub.original-host-reviewer-candidate.v1" ||
      reviewer.sourceId !== "rosevear-ai-hub" ||
      typeof reviewer.sourceSha !== "string" || !SHA40.test(reviewer.sourceSha) ||
      typeof reviewer.custodyDigestClaim !== "string" ||
      !SHA64.test(reviewer.custodyDigestClaim) ||
      typeof reviewer.reviewerReference !== "string" || !REF.test(reviewer.reviewerReference) ||
      reviewer.evidenceOrigin !== "OWNER_SUPPLIED_METADATA_ONLY" ||
      reviewer.independentIdentityState !== "NOT_VERIFIED" ||
      reviewer.signatureState !== "NOT_VERIFIED" ||
      reviewer.originalHostState !== "NOT_VERIFIED" ||
      reviewer.ownerConsentState !== "NOT_VERIFIED" ||
      time(reviewer.reviewedAtUtc) === null) return result(["REVIEWER_SCHEMA_INVALID"]);
  const issues: ProvenanceIssue299[] = [];
  if (reviewer.sourceSha !== packet.sourceSha || reviewer.sourceSha !== input.expectedMainSha)
    issues.push("SOURCE_REVISION_MISMATCH");
  if (reviewer.custodyDigestClaim !== packet.custodyDigestClaim)
    issues.push("CUSTODY_DIGEST_MISMATCH");
  const reviewerMs = time(reviewer.reviewedAtUtc)!;
  const packetMs = time(packet.createdAtUtc)!;
  if (reviewerMs < packetMs || reviewerMs > input.nowMs + 60_000)
    issues.push("REVIEWER_CHRONOLOGY_INVALID");
  if (input.nowMs - reviewerMs > 30 * 60_000) issues.push("REVIEWER_STALE");
  issues.push("ORIGINAL_PROOF_UNVERIFIED");
  return result(issues, reviewer.reviewerReference);
}

/** Safe status export only; no raw packet, reviewer JSON, claims or secrets. */
export function exportShellStatus299(input: {
  report: ReturnType<typeof reconcileOriginalProvenance299>;
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !SHA40.test(input.expectedMainSha) ||
      input.report.expectedMainSha !== input.expectedMainSha ||
      !Number.isSafeInteger(input.nowMs) || input.nowMs < 0 ||
      !Number.isFinite(new Date(input.nowMs).getTime())) return null;
  return {
    schema: "rosevear.ai-hub.shell-status-export.v1" as const,
    createdAtUtc: new Date(input.nowMs).toISOString(),
    sourceId: "rosevear-ai-hub" as const,
    sourceSha: input.expectedMainSha,
    source: "PRIVATE_BROWSER_REVIEW_NOT_INDEPENDENT_EVIDENCE" as const,
    provenanceState: input.report.state,
    issueCodes: input.report.issues,
    packetState: input.report.packetState,
    destinations: ["ai-data-platform", "rosevear-comms-hub"] as const,
    originalHostVerified: false as const,
    independentReviewerVerified: false as const,
    signedReceiptVerified: false as const,
    signedOwnerConsentVerified: false as const,
    acceptedEvidence: 0 as const,
    messagesSent: 0 as const,
    transport: "DISABLED" as const,
    published: false as const,
    productionConnection: "HOLD" as const,
  };
}

