import { FIELD_RECEIPT_CHECKLIST_296 } from "./windowsCustodyReview296";
import { SOURCE_MAP_297 } from "./windowsFieldPacket297";

export type ReviewIssue298 = "PACKET_MISSING" | "SCHEMA_INVALID" |
  "SOURCE_REVISION_DRIFT" | "PACKET_STALE" | "INDEPENDENT_PROOF_MISSING";
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const PACKET_KEYS = ["schema", "createdAtUtc", "sourceSha", "provenance", "ownerAction",
  "custodyDigestClaim", "originalHostVerified", "independentSignerVerified",
  "witnessVerified", "signedConsentVerified", "cryptographicReceiptVerified",
  "evidenceRequirements", "sourceMapping", "verifiedReceipts", "shellMessagesSent",
  "productionAuthorization"];
const MAP_KEYS = ["application", "role", "lane", "connection", "transport", "published"];
const GATE_KEYS = ["id", "authority", "requiredEvidence", "state"];

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}

export function inspectFieldPacket298(raw: string, expectedMainSha: string, nowMs: number) {
  const rejected = (code: ReviewIssue298) => ({
    schema: "rosevear.ai-hub.field-receipt-review.v1" as const,
    sourceIdentity: "rosevear-ai-hub" as const,
    state: "REJECTED_HOLD" as const,
    issues: [code] as readonly ReviewIssue298[],
    sourceSha: null as string | null,
    verifiedReceipts: 0 as const, shellMessagesSent: 0 as const,
    sourceSignerVerified: false as const, originalHostVerified: false as const,
    shellAuthorized: false as const,
  });
  if (!raw.trim()) return rejected("PACKET_MISSING");
  if (raw.length > 24_576 || !SHA40.test(expectedMainSha) ||
      !Number.isSafeInteger(nowMs) || nowMs < 0) return rejected("SCHEMA_INVALID");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return rejected("SCHEMA_INVALID"); }
  if (!exact(value, PACKET_KEYS) ||
      value.schema !== "rosevear.ai-hub.independent-field-review-packet.v1" ||
      value.provenance !== "PRIVATE_BROWSER_SESSION_UNVERIFIED" ||
      value.ownerAction !== "SUPERVISED_REVIEW_HANDOFF_ONLY" ||
      typeof value.sourceSha !== "string" || !SHA40.test(value.sourceSha) ||
      typeof value.custodyDigestClaim !== "string" || !SHA64.test(value.custodyDigestClaim) ||
      value.productionAuthorization !== "HOLD" || value.verifiedReceipts !== 0 ||
      value.shellMessagesSent !== 0 ||
      ["originalHostVerified", "independentSignerVerified", "witnessVerified",
       "signedConsentVerified", "cryptographicReceiptVerified"].some(k => value[k] !== false) ||
      !Array.isArray(value.evidenceRequirements) ||
      value.evidenceRequirements.length !== FIELD_RECEIPT_CHECKLIST_296.length ||
      !FIELD_RECEIPT_CHECKLIST_296.every((gate, index) => {
        const entry = (value.evidenceRequirements as unknown[])[index];
        return exact(entry, GATE_KEYS) && entry.id === gate.id &&
          entry.authority === gate.authority && entry.requiredEvidence === gate.requiredEvidence &&
          entry.state === "INDEPENDENT_PROOF_NOT_RECEIVED";
      }) || !Array.isArray(value.sourceMapping) ||
      value.sourceMapping.length !== SOURCE_MAP_297.length ||
      !SOURCE_MAP_297.every((source, index) => {
        const entry = (value.sourceMapping as unknown[])[index];
        return exact(entry, MAP_KEYS) && entry.application === source.application &&
          entry.role === source.role && entry.lane === source.lane &&
          entry.connection === "NOT_VERIFIED" && entry.transport === "DISABLED" &&
          entry.published === false;
      })) return rejected("SCHEMA_INVALID");
  const timestamp = typeof value.createdAtUtc === "string" &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value.createdAtUtc)
      ? Date.parse(value.createdAtUtc) : NaN;
  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > nowMs + 60_000)
    return rejected("SCHEMA_INVALID");
  const issues: ReviewIssue298[] = [];
  if (value.sourceSha !== expectedMainSha) issues.push("SOURCE_REVISION_DRIFT");
  if (nowMs - timestamp > 30 * 60_000) issues.push("PACKET_STALE");
  issues.push("INDEPENDENT_PROOF_MISSING");
  return {
    ...rejected("INDEPENDENT_PROOF_MISSING"),
    state: "REVIEW_ONLY_HOLD" as const,
    issues, sourceSha: value.sourceSha,
  };
}

export function recordOwnerTriage298(input: {
  issue: ReviewIssue298;
  observedIssues: readonly ReviewIssue298[];
  expectedMainSha: string;
  acknowledged: boolean;
  nowMs: number;
}) {
  if (!input.acknowledged || !input.observedIssues.includes(input.issue) ||
      !SHA40.test(input.expectedMainSha) ||
      !Number.isSafeInteger(input.nowMs) || input.nowMs < 0) return null;
  return {
    recordedAtUtc: new Date(input.nowMs).toISOString(),
    sourceSha: input.expectedMainSha,
    issue: input.issue,
    disposition: "OWNER_REVIEW_REQUIRED_OPEN_HOLD" as const,
    independentReceiptVerified: false as const,
    connectionAuthorized: false as const,
    provenance: "BROWSER_SESSION_UNVERIFIED" as const,
  };
}

