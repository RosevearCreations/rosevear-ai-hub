/** Build 289: inspect a downloaded Build 288 request, without trusting its origin. */
export type OfflineHandoffReview289 =
  | { state: "REJECTED"; reason: string }
  | { state: "DIGEST_MATCH_UNVERIFIED"; digest: string; sampleAt: string;
      ownerRecordedAt: string; releaseCandidate: string | null; checkoutCandidate: string | null;
      ownerOutcome: "owner_reported_working" | "owner_reported_issue";
      olderThanFiveMinutes: boolean; driftAcknowledged: boolean };

export const MAX_OFFLINE_HANDOFF_BYTES_289 = 16_384;
const SHA40 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DRIFT = ["UPDATER_RELEASE_CHANGED", "CHECKOUT_CHANGED", "WEB_LAUNCHER_CHANGED",
  "BACKEND_LAUNCHER_CHANGED", "STARTUP_TASK_CHANGED"];
const GAP_LIST = [
  "approved sourceRevision and sourceSequence", "signed webhook receipt and approved HMAC key binding",
  "issued eventId, correlationId and idempotencyKey", "approved evidenceURI and expiration",
  "independent original-host witness and trusted owner signature", "authorized transport and registry acceptance",
];

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ?
    value as Record<string, unknown> : null;
}

function exact(value: unknown, names: readonly string[]): value is Record<string, unknown> {
  const record = object(value);
  return record !== null && Object.keys(record).length === names.length &&
    Object.keys(record).every(name => names.includes(name));
}

function nullableSha(value: unknown): value is string | null {
  return value === null || typeof value === "string" && SHA40.test(value);
}

function isoTime(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : null;
}

function launcher(value: unknown): boolean {
  if (value === null) return true;
  if (!exact(value, ["listener", "chainStatus", "ancestorKinds", "recoveryScriptMentioned",
    "processPredatesCheckoutCommit", "launchSource"])) return false;
  return ["observed", "missing", "ambiguous", "process_unavailable", "changed_during_observation", "probe_failed"].includes(value.listener as string) &&
    ["unavailable", "listener_changed_or_ambiguous", "partial_or_complete", "process_unavailable", "probe_failed"].includes(value.chainStatus as string) &&
    Array.isArray(value.ancestorKinds) && value.ancestorKinds.length <= 6 &&
    value.ancestorKinds.every(kind => ["node", "python", "powershell", "cmd", "explorer", "other"].includes(kind)) &&
    typeof value.recoveryScriptMentioned === "boolean" &&
    (value.processPredatesCheckoutCommit === null || typeof value.processPredatesCheckoutCommit === "boolean") &&
    ["unknown", "recovery_script_mention_unverified"].includes(value.launchSource as string);
}

function validShape(request: Record<string, unknown>): boolean {
  const content = request.content;
  const signing = request.signing;
  const contract = request.masterShellContract;
  if (!exact(content, ["sourceId", "shellId", "tenantId", "ownerOutcome", "ownerRecordedAt",
    "inspectorSampledAt", "releaseCandidateSha", "checkoutCandidateSha", "startupTask", "webLauncher",
    "backendLauncher", "observedDrift", "driftReview"]) ||
    !exact(signing, ["signature", "signerKeyId", "trustedKeyFingerprint", "state"]) ||
    !exact(contract, ["schema", "schemaVersion", "sourceId", "shellId", "tenantId", "eventType",
      "audience", "verificationState", "transport", "missingRequiredEvidence"])) return false;
  const drift = content.observedDrift;
  const acknowledged = content.driftReview === "owner_acknowledged_unverified";
  return request.schema === "rosevear.ai-hub.windows-evidence-signing-request.v1" &&
    request.published === false && typeof request.contentSha256 === "string" && SHA256.test(request.contentSha256) &&
    content.sourceId === "rosevear-ai-hub" && content.shellId === "rosevear-ai-hub" && content.tenantId === null &&
    ["owner_reported_working", "owner_reported_issue"].includes(content.ownerOutcome as string) &&
    nullableSha(content.releaseCandidateSha) && nullableSha(content.checkoutCandidateSha) &&
    ["enabled", "disabled", "missing_or_unavailable", "unknown", "NOT_SAMPLED"].includes(content.startupTask as string) &&
    launcher(content.webLauncher) && launcher(content.backendLauncher) &&
    Array.isArray(drift) && drift.length <= DRIFT.length && new Set(drift).size === drift.length &&
    drift.every(value => DRIFT.includes(value)) &&
    (acknowledged ? drift.length > 0 : content.driftReview === "no_drift_observed_unverified" && drift.length === 0) &&
    signing.signature === null && signing.signerKeyId === null && signing.trustedKeyFingerprint === null &&
    signing.state === "AWAITING_APPROVED_ORIGINAL_HOST_SIGNER_AND_INDEPENDENT_WITNESS" &&
    contract.schema === "rosevear.master-shell.event.v1" && contract.schemaVersion === "1.0.0" &&
    contract.sourceId === "rosevear-ai-hub" && contract.shellId === "rosevear-ai-hub" &&
    contract.tenantId === null && contract.eventType === "audit.evidence.recorded" &&
    Array.isArray(contract.audience) && contract.audience.length === 1 && contract.audience[0] === "ai-data-platform" &&
    contract.verificationState === "held" &&
    contract.transport === "NO_SIGNED_WEBHOOK_OR_APPROVED_SOURCE_PUBLISHER" &&
    Array.isArray(contract.missingRequiredEvidence) &&
    JSON.stringify(contract.missingRequiredEvidence) === JSON.stringify(GAP_LIST);
}

/** Digest match means the untrusted content is internally consistent, NOT that it is signed or authentic. */
export async function reviewOfflineWindowsHandoff289(
  text: string, nowMs: number = Date.now(),
  digest: (bytes: Uint8Array) => Promise<ArrayBuffer> = async bytes => {
    if (!globalThis.crypto?.subtle) throw new Error("CRYPTO_UNAVAILABLE");
    return globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  },
): Promise<OfflineHandoffReview289> {
  const rejected = (reason: string): OfflineHandoffReview289 => ({ state: "REJECTED", reason });
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || typeof text !== "string" ||
      new TextEncoder().encode(text).byteLength > MAX_OFFLINE_HANDOFF_BYTES_289) return rejected("SIZE_OR_CLOCK_INVALID");
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { return rejected("INVALID_JSON"); }
  if (!exact(parsed, ["schema", "content", "contentSha256", "signing", "masterShellContract", "published"]) ||
      !validShape(parsed)) return rejected("UNSUPPORTED_OR_UNSAFE_HANDOFF");
  const content = parsed.content as Record<string, unknown>;
  const sampleAtMs = isoTime(content.inspectorSampledAt);
  const ownerAtMs = isoTime(content.ownerRecordedAt);
  if (sampleAtMs === null || ownerAtMs === null || sampleAtMs > nowMs + 60_000 ||
      ownerAtMs > nowMs + 60_000 || ownerAtMs < sampleAtMs - 60_000) return rejected("INVALID_OBSERVATION_TIMES");
  let actual: ArrayBuffer;
  try { actual = await digest(new TextEncoder().encode(JSON.stringify(content))); }
  catch { return rejected("SECURE_DIGEST_UNAVAILABLE"); }
  if (actual.byteLength !== 32) return rejected("SECURE_DIGEST_UNAVAILABLE");
  const computed = Array.from(new Uint8Array(actual), byte => byte.toString(16).padStart(2, "0")).join("");
  if (computed !== parsed.contentSha256) return rejected("CONTENT_DIGEST_MISMATCH");
  return {
    state: "DIGEST_MATCH_UNVERIFIED", digest: computed,
    sampleAt: content.inspectorSampledAt as string, ownerRecordedAt: content.ownerRecordedAt as string,
    releaseCandidate: content.releaseCandidateSha as string | null,
    checkoutCandidate: content.checkoutCandidateSha as string | null,
    ownerOutcome: content.ownerOutcome as "owner_reported_working" | "owner_reported_issue",
    olderThanFiveMinutes: nowMs - sampleAtMs > 5 * 60_000,
    driftAcknowledged: content.driftReview === "owner_acknowledged_unverified",
  };
}
