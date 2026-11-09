import type { LauncherReview } from "./windowsLauncherEvidence286";
import {
  inspectWindowsLauncherDrift287, previousWindowsTransition287,
  windowsOwnerStorageKey287, type LauncherDriftCode, type OwnerWindowsRecord,
} from "./windowsOwnerAcceptance287";

/** An owner acknowledgement is a local review of change, never authority to accept a release. */
export type WindowsDriftAcknowledgement288 = Readonly<{
  version: 1;
  state: "owner_reviewed_unverified";
  acknowledgedAtMs: number;
  referenceRecordedAtMs: number;
  sampleAtMs: number;
  changes: readonly LauncherDriftCode[];
  comparison: "current_vs_latest" | "recorded_transition";
  recordedSha: string | null;
  checkoutSha: string | null;
}>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const CHANGE_CODES: readonly LauncherDriftCode[] = [
  "UPDATER_RELEASE_CHANGED", "CHECKOUT_CHANGED", "WEB_LAUNCHER_CHANGED",
  "BACKEND_LAUNCHER_CHANGED", "STARTUP_TASK_CHANGED",
];
const SAMPLE_MAX_AGE_MS = 5 * 60_000;
const OWNER_MAX_AGE_MS = 30 * 24 * 60 * 60_000;
const CLOCK_SKEW_MS = 60_000;
const MAX_JSON_BYTES = 2_000;
const SHA40 = /^[a-f0-9]{40}$/;

export function windowsDriftAckKey288(ownerId: string): string | null {
  const ownerKey = windowsOwnerStorageKey287(ownerId);
  return ownerKey ? `${ownerKey}:drift-ack-v1` : null;
}

function validAck(value: unknown): WindowsDriftAcknowledgement288 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const x = value as Record<string, unknown>;
  if (x.version !== 1 || x.state !== "owner_reviewed_unverified" ||
      !Number.isSafeInteger(x.acknowledgedAtMs) || !Number.isSafeInteger(x.referenceRecordedAtMs) ||
      !Number.isSafeInteger(x.sampleAtMs) ||
      (x.acknowledgedAtMs as number) < 0 || (x.referenceRecordedAtMs as number) < 0 ||
      (x.sampleAtMs as number) < 0 ||
      (x.recordedSha !== null && (typeof x.recordedSha !== "string" || !SHA40.test(x.recordedSha))) ||
      (x.checkoutSha !== null && (typeof x.checkoutSha !== "string" || !SHA40.test(x.checkoutSha))) ||
      (x.comparison !== "current_vs_latest" && x.comparison !== "recorded_transition") ||
      !Array.isArray(x.changes) || x.changes.length === 0 || x.changes.length > CHANGE_CODES.length ||
      x.changes.some((code: unknown) => !CHANGE_CODES.includes(code as LauncherDriftCode)) ||
      new Set(x.changes).size !== x.changes.length) return null;
  return {
    version: 1, state: "owner_reviewed_unverified",
    acknowledgedAtMs: x.acknowledgedAtMs as number,
    referenceRecordedAtMs: x.referenceRecordedAtMs as number,
    sampleAtMs: x.sampleAtMs as number,
    changes: [...x.changes] as LauncherDriftCode[], comparison: x.comparison,
    recordedSha: x.recordedSha as string | null, checkoutSha: x.checkoutSha as string | null,
  };
}

export function loadWindowsDriftAck288(storage: StorageLike | null, ownerId: string): WindowsDriftAcknowledgement288 | null {
  const key = windowsDriftAckKey288(ownerId);
  if (!storage || !key) return null;
  try {
    const raw = storage.getItem(key);
    return raw && raw.length <= MAX_JSON_BYTES ? validAck(JSON.parse(raw)) : null;
  } catch { return null; }
}

function fresh(review: LauncherReview | null, nowMs: number): review is LauncherReview & { sampledAtMs: number } {
  return !!review && Number.isSafeInteger(nowMs) && review.sampledAtMs !== null &&
    Number.isSafeInteger(review.sampledAtMs) && review.sampledAtMs <= nowMs + CLOCK_SKEW_MS &&
    nowMs - review.sampledAtMs <= SAMPLE_MAX_AGE_MS &&
    ["CANDIDATES_MATCH_UNVERIFIED", "CANDIDATES_DIFFER", "MISSING_CANDIDATE"].includes(review.state) &&
    (review.recordedSha === null || SHA40.test(review.recordedSha)) &&
    (review.checkoutSha === null || SHA40.test(review.checkoutSha));
}

export function reviewWindowsDrift288(records: readonly OwnerWindowsRecord[], review: LauncherReview | null, nowMs: number) {
  const last = records.at(-1) ?? null;
  const live = inspectWindowsLauncherDrift287(last, review, nowMs);
  if (!last || !fresh(review, nowMs) || nowMs - last.recordedAtMs > OWNER_MAX_AGE_MS ||
      last.recordedAtMs > nowMs + CLOCK_SKEW_MS) {
    return { state: "HOLD_MISSING_OR_STALE_OWNER_EVIDENCE" as const, changes: [] as readonly LauncherDriftCode[], comparison: null };
  }
  if (live.state === "DRIFT_DETECTED") {
    return { state: "DRIFT_NEEDS_ACKNOWLEDGEMENT" as const, changes: live.changes, comparison: "current_vs_latest" as const };
  }
  if (live.state !== "NO_CHANGE_OBSERVED_UNVERIFIED") {
    return { state: "HOLD_INVALID_COMPARISON" as const, changes: [] as readonly LauncherDriftCode[], comparison: null };
  }
  const previous = previousWindowsTransition287(records);
  return previous.length ? {
    state: "DRIFT_NEEDS_ACKNOWLEDGEMENT" as const, changes: previous, comparison: "recorded_transition" as const,
  } : { state: "NO_DRIFT_OBSERVED_UNVERIFIED" as const, changes: [] as readonly LauncherDriftCode[], comparison: null };
}

export function acknowledgementMatches288(
  ack: WindowsDriftAcknowledgement288 | null,
  records: readonly OwnerWindowsRecord[], review: LauncherReview | null, nowMs: number,
): boolean {
  const last = records.at(-1);
  const drift = reviewWindowsDrift288(records, review, nowMs);
  if (!ack || !last || !fresh(review, nowMs) || drift.state !== "DRIFT_NEEDS_ACKNOWLEDGEMENT" ||
      ack.referenceRecordedAtMs !== last.recordedAtMs || ack.sampleAtMs !== review.sampledAtMs ||
      ack.recordedSha !== review.recordedSha || ack.checkoutSha !== review.checkoutSha ||
      ack.comparison !== drift.comparison || ack.acknowledgedAtMs > nowMs + CLOCK_SKEW_MS ||
      ack.acknowledgedAtMs < review.sampledAtMs - CLOCK_SKEW_MS) return false;
  return JSON.stringify(ack.changes) === JSON.stringify(drift.changes);
}

export function acknowledgeWindowsDrift288(
  storage: StorageLike | null, ownerId: string, records: readonly OwnerWindowsRecord[],
  review: LauncherReview | null, confirmed: boolean, nowMs: number,
): WindowsDriftAcknowledgement288 | null {
  const key = windowsDriftAckKey288(ownerId);
  const drift = reviewWindowsDrift288(records, review, nowMs);
  const last = records.at(-1);
  if (!key || !storage || !confirmed || !last || !fresh(review, nowMs) ||
      drift.state !== "DRIFT_NEEDS_ACKNOWLEDGEMENT" || !drift.comparison) return null;
  const ack: WindowsDriftAcknowledgement288 = {
    version: 1, state: "owner_reviewed_unverified", acknowledgedAtMs: nowMs,
    referenceRecordedAtMs: last.recordedAtMs, sampleAtMs: review.sampledAtMs,
    changes: [...drift.changes], comparison: drift.comparison,
    recordedSha: review.recordedSha, checkoutSha: review.checkoutSha,
  };
  try { storage.setItem(key, JSON.stringify(ack)); return ack; }
  catch { return null; }
}

export type WindowsSigningRequest288 = Readonly<{
  schema: "rosevear.ai-hub.windows-evidence-signing-request.v1";
  content: {
    sourceId: "rosevear-ai-hub"; shellId: "rosevear-ai-hub"; tenantId: null;
    ownerOutcome: OwnerWindowsRecord["outcome"];
    ownerRecordedAt: string; inspectorSampledAt: string;
    releaseCandidateSha: string | null; checkoutCandidateSha: string | null;
    startupTask: string; webLauncher: OwnerWindowsRecord["web"];
    backendLauncher: OwnerWindowsRecord["backend"];
    observedDrift: readonly LauncherDriftCode[];
    driftReview: "no_drift_observed_unverified" | "owner_acknowledged_unverified";
  };
  contentSha256: string;
  signing: { signature: null; signerKeyId: null; trustedKeyFingerprint: null;
    state: "AWAITING_APPROVED_ORIGINAL_HOST_SIGNER_AND_INDEPENDENT_WITNESS" };
  masterShellContract: {
    schema: "rosevear.master-shell.event.v1"; schemaVersion: "1.0.0";
    sourceId: "rosevear-ai-hub"; shellId: "rosevear-ai-hub"; tenantId: null;
    eventType: "audit.evidence.recorded"; audience: readonly ["ai-data-platform"];
    verificationState: "held";
    transport: "NO_SIGNED_WEBHOOK_OR_APPROVED_SOURCE_PUBLISHER";
    missingRequiredEvidence: readonly string[];
  };
  published: false;
}>;

const CONTRACT_GAPS = [
  "approved sourceRevision and sourceSequence", "signed webhook receipt and approved HMAC key binding",
  "issued eventId, correlationId and idempotencyKey", "approved evidenceURI and expiration",
  "independent original-host witness and trusted owner signature", "authorized transport and registry acceptance",
] as const;

/** Signing *request*, not a signed receipt or a publishable Master Shell event. */
export async function prepareWindowsSigningRequest288(
  records: readonly OwnerWindowsRecord[], review: LauncherReview | null,
  ack: WindowsDriftAcknowledgement288 | null, nowMs: number,
  digest: (bytes: Uint8Array) => Promise<ArrayBuffer> = async bytes => {
    if (!globalThis.crypto?.subtle) throw new Error("SIGNING_REQUEST_DIGEST_UNAVAILABLE");
    return globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource);
  },
): Promise<WindowsSigningRequest288 | null> {
  const last = records.at(-1);
  const drift = reviewWindowsDrift288(records, review, nowMs);
  if (!last || !fresh(review, nowMs) ||
      (drift.state !== "NO_DRIFT_OBSERVED_UNVERIFIED" &&
       (drift.state !== "DRIFT_NEEDS_ACKNOWLEDGEMENT" || !acknowledgementMatches288(ack, records, review, nowMs)))) return null;
  // The object uses a fixed key order, and the digest covers exactly the exported content bytes.
  const content = {
    sourceId: "rosevear-ai-hub" as const, shellId: "rosevear-ai-hub" as const, tenantId: null,
    ownerOutcome: last.outcome, ownerRecordedAt: new Date(last.recordedAtMs).toISOString(),
    inspectorSampledAt: new Date(review.sampledAtMs).toISOString(),
    releaseCandidateSha: review.recordedSha, checkoutCandidateSha: review.checkoutSha,
    startupTask: review.startupTask, webLauncher: review.web, backendLauncher: review.backend,
    observedDrift: [...drift.changes],
    driftReview: drift.state === "DRIFT_NEEDS_ACKNOWLEDGEMENT" ?
      "owner_acknowledged_unverified" as const : "no_drift_observed_unverified" as const,
  };
  const hash = await digest(new TextEncoder().encode(JSON.stringify(content)));
  if (hash.byteLength !== 32) throw new Error("SIGNING_REQUEST_DIGEST_INVALID");
  const contentSha256 = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
  return {
    schema: "rosevear.ai-hub.windows-evidence-signing-request.v1", content, contentSha256,
    signing: { signature: null, signerKeyId: null, trustedKeyFingerprint: null,
      state: "AWAITING_APPROVED_ORIGINAL_HOST_SIGNER_AND_INDEPENDENT_WITNESS" },
    masterShellContract: {
      schema: "rosevear.master-shell.event.v1", schemaVersion: "1.0.0",
      sourceId: "rosevear-ai-hub", shellId: "rosevear-ai-hub", tenantId: null,
      eventType: "audit.evidence.recorded", audience: ["ai-data-platform"], verificationState: "held",
      transport: "NO_SIGNED_WEBHOOK_OR_APPROVED_SOURCE_PUBLISHER", missingRequiredEvidence: CONTRACT_GAPS,
    },
    published: false,
  };
}
