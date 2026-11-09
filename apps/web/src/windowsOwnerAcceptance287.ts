import type { Launcher, LauncherReview } from "./windowsLauncherEvidence286";

/** Browser-local owner claims are NOT installed-host attestation or a signed receipt. */
export type OwnerWindowsOutcome = "owner_reported_working" | "owner_reported_issue";
export type LauncherDriftCode = "UPDATER_RELEASE_CHANGED" | "CHECKOUT_CHANGED" |
  "WEB_LAUNCHER_CHANGED" | "BACKEND_LAUNCHER_CHANGED" | "STARTUP_TASK_CHANGED";
export type OwnerWindowsRecord = Readonly<{
  observedAtMs: number;
  recordedAtMs: number;
  outcome: OwnerWindowsOutcome;
  updaterSha: string | null;
  checkoutSha: string | null;
  startupTask: string;
  web: Launcher | null;
  backend: Launcher | null;
}>;
export type LauncherDriftReview = Readonly<{
  state: "NO_REFERENCE" | "NO_CURRENT_SAMPLE" | "CURRENT_SAMPLE_ON_HOLD" |
    "STALE_REFERENCE" | "CLOCK_CHECK" | "NO_CHANGE_OBSERVED_UNVERIFIED" | "DRIFT_DETECTED";
  changes: readonly LauncherDriftCode[];
}>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const RETENTION_MS = 30 * 24 * 60 * 60_000;
const CURRENT_MS = 5 * 60_000;
const FUTURE_TOLERANCE_MS = 60_000;
const MAX_RECORDS = 5;
const MAX_BYTES = 10_000;
const VERSION = 1;
const KINDS = new Set(["node", "python", "powershell", "cmd", "explorer", "other"]);
const LISTENERS = new Set(["observed", "missing", "ambiguous", "process_unavailable", "changed_during_observation", "probe_failed"]);
const CHAINS = new Set(["unavailable", "listener_changed_or_ambiguous", "partial_or_complete", "process_unavailable", "probe_failed"]);
const STARTUP = new Set(["enabled", "disabled", "missing_or_unavailable", "unknown", "NOT_SAMPLED"]);

export function windowsOwnerStorageKey287(ownerId: string): string | null {
  const id = ownerId.trim();
  if (!id || id.length > 120 || /[\u0000-\u001f\u007f]/u.test(id)) return null;
  return `hub-windows-owner-observation-v${VERSION}:${encodeURIComponent(id)}`;
}

function isSha(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}
function isLauncher(value: unknown): value is Launcher {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.listener === "string" && LISTENERS.has(record.listener) &&
    typeof record.chainStatus === "string" && CHAINS.has(record.chainStatus) &&
    Array.isArray(record.ancestorKinds) && record.ancestorKinds.length <= 6 &&
    record.ancestorKinds.every((kind: unknown) => typeof kind === "string" && KINDS.has(kind)) &&
    typeof record.recoveryScriptMentioned === "boolean" &&
    (record.processPredatesCheckoutCommit === null || typeof record.processPredatesCheckoutCommit === "boolean") &&
    (record.launchSource === "unknown" || record.launchSource === "recovery_script_mention_unverified");
}
function canonicalLauncher(value: Launcher | null): Launcher | null {
  if (!value || !isLauncher(value)) return null;
  return {
    listener: value.listener,
    chainStatus: value.chainStatus,
    ancestorKinds: [...value.ancestorKinds],
    recoveryScriptMentioned: value.recoveryScriptMentioned,
    processPredatesCheckoutCommit: value.processPredatesCheckoutCommit,
    launchSource: value.launchSource,
  };
}
function validRecord(value: unknown): OwnerWindowsRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (!Number.isSafeInteger(data.observedAtMs) || !Number.isSafeInteger(data.recordedAtMs) ||
    (data.observedAtMs as number) < 0 || (data.recordedAtMs as number) < 0 ||
    (data.outcome !== "owner_reported_working" && data.outcome !== "owner_reported_issue") ||
    (data.updaterSha !== null && !isSha(data.updaterSha)) ||
    (data.checkoutSha !== null && !isSha(data.checkoutSha)) ||
    typeof data.startupTask !== "string" || !STARTUP.has(data.startupTask) ||
    (data.web !== null && !isLauncher(data.web)) ||
    (data.backend !== null && !isLauncher(data.backend))) return null;
  return {
    observedAtMs: data.observedAtMs as number,
    recordedAtMs: data.recordedAtMs as number,
    outcome: data.outcome,
    updaterSha: data.updaterSha,
    checkoutSha: data.checkoutSha,
    startupTask: data.startupTask,
    web: canonicalLauncher(data.web),
    backend: canonicalLauncher(data.backend),
  } as OwnerWindowsRecord;
}

export function loadOwnerWindowsRecords287(storage: StorageLike | null, ownerId: string): OwnerWindowsRecord[] {
  const key = windowsOwnerStorageKey287(ownerId);
  if (!storage || !key) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > MAX_BYTES) return [];
    const document: unknown = JSON.parse(raw);
    if (!document || typeof document !== "object" || Array.isArray(document)) return [];
    const data = document as Record<string, unknown>;
    if (data.version !== VERSION || !Array.isArray(data.records) || data.records.length > MAX_RECORDS) return [];
    return data.records.map(validRecord).filter((value): value is OwnerWindowsRecord => value !== null);
  } catch { return []; }
}

function sampleCurrent(review: LauncherReview | null, nowMs: number): boolean {
  if (!review || !Number.isSafeInteger(nowMs) || !Number.isSafeInteger(review.sampledAtMs)) return false;
  return (review.sampledAtMs as number) <= nowMs + FUTURE_TOLERANCE_MS &&
    nowMs - (review.sampledAtMs as number) <= CURRENT_MS &&
    (review.state === "CANDIDATES_MATCH_UNVERIFIED" || review.state === "CANDIDATES_DIFFER" ||
     review.state === "MISSING_CANDIDATE");
}
function snapshotFromReview(review: LauncherReview, outcome: OwnerWindowsOutcome, nowMs: number): OwnerWindowsRecord {
  return {
    observedAtMs: review.sampledAtMs as number,
    recordedAtMs: nowMs,
    outcome,
    updaterSha: review.recordedSha,
    checkoutSha: review.checkoutSha,
    startupTask: review.startupTask,
    web: canonicalLauncher(review.web),
    backend: canonicalLauncher(review.backend),
  };
}

/** Manual, explicit local save; never accepts a missing, stale or fabricated live sample. */
export function recordWindowsOwnerObservation287(
  storage: StorageLike | null, ownerId: string, existing: readonly OwnerWindowsRecord[],
  review: LauncherReview | null, outcome: OwnerWindowsOutcome, acknowledged: boolean, nowMs: number,
): { saved: boolean; records: OwnerWindowsRecord[] } {
  const key = windowsOwnerStorageKey287(ownerId);
  if (!storage || !key || !acknowledged || !sampleCurrent(review, nowMs) ||
      (outcome !== "owner_reported_working" && outcome !== "owner_reported_issue") ||
      (outcome === "owner_reported_working" && (
        review?.state !== "CANDIDATES_MATCH_UNVERIFIED" ||
        review.web?.listener !== "observed" || review.backend?.listener !== "observed" ||
        review.web?.chainStatus !== "partial_or_complete" || review.backend?.chainStatus !== "partial_or_complete" ||
        review.web?.processPredatesCheckoutCommit === true || review.backend?.processPredatesCheckoutCommit === true
      ))) return { saved: false, records: [...existing] };
  const candidate = validRecord(snapshotFromReview(review as LauncherReview, outcome, nowMs));
  if (!candidate) return { saved: false, records: [...existing] };
  const next = [...existing.map(validRecord).filter((item): item is OwnerWindowsRecord => item !== null),
    candidate].slice(-MAX_RECORDS);
  try {
    storage.setItem(key, JSON.stringify({ version: VERSION, records: next }));
    return { saved: true, records: next };
  } catch { return { saved: false, records: [...existing] }; }
}

function changesFrom(previous: OwnerWindowsRecord, current: OwnerWindowsRecord): LauncherDriftCode[] {
  const changes: LauncherDriftCode[] = [];
  if (previous.updaterSha !== current.updaterSha) changes.push("UPDATER_RELEASE_CHANGED");
  if (previous.checkoutSha !== current.checkoutSha) changes.push("CHECKOUT_CHANGED");
  if (JSON.stringify(previous.web) !== JSON.stringify(current.web)) changes.push("WEB_LAUNCHER_CHANGED");
  if (JSON.stringify(previous.backend) !== JSON.stringify(current.backend)) changes.push("BACKEND_LAUNCHER_CHANGED");
  if (previous.startupTask !== current.startupTask) changes.push("STARTUP_TASK_CHANGED");
  return changes;
}

export function previousWindowsTransition287(records: readonly OwnerWindowsRecord[]): readonly LauncherDriftCode[] {
  return records.length >= 2 ? changesFrom(records[records.length - 2], records[records.length - 1]) : [];
}

export function inspectWindowsLauncherDrift287(
  previous: OwnerWindowsRecord | null, current: LauncherReview | null, nowMs: number,
): LauncherDriftReview {
  if (!previous) return { state: "NO_REFERENCE", changes: [] };
  if (!current) return { state: "NO_CURRENT_SAMPLE", changes: [] };
  if (!sampleCurrent(current, nowMs)) return { state: "CURRENT_SAMPLE_ON_HOLD", changes: [] };
  if (previous.recordedAtMs > nowMs + FUTURE_TOLERANCE_MS) return { state: "CLOCK_CHECK", changes: [] };
  const changes = changesFrom(previous, snapshotFromReview(current, previous.outcome, nowMs));
  if (nowMs - previous.recordedAtMs > RETENTION_MS) return { state: "STALE_REFERENCE", changes };
  return { state: changes.length ? "DRIFT_DETECTED" : "NO_CHANGE_OBSERVED_UNVERIFIED", changes };
}

/** Suite reporting stays on HOLD; no shared contract or independent proof is inferred. */
export function masterShellWindowsReadiness287(
  records: readonly OwnerWindowsRecord[], current: LauncherReview | null, nowMs: number,
) {
  const last = records.at(-1) ?? null;
  const drift = inspectWindowsLauncherDrift287(last, current, nowMs);
  return {
    schema: "rosevear.ai-hub.windows-owner-master-shell-candidate.v0",
    appId: "rosevear-ai-hub",
    source: "OWNER_BROWSER_LOCAL_AND_READ_ONLY_INSPECTOR",
    status: "LOCAL_PREVIEW_NOT_SENT",
    observedOwnerRecordCount: Math.min(records.length, MAX_RECORDS),
    lastOwnerOutcome: last?.outcome ?? null,
    lastOwnerRecordAge: !last ? "NOT_RECORDED" :
      last.recordedAtMs > nowMs + FUTURE_TOLERANCE_MS ? "CLOCK_CHECK" :
      nowMs - last.recordedAtMs > RETENTION_MS ? "STALE" : "OWNER_REPORTED_ONLY",
    currentLauncherState: current?.state ?? "NOT_SAMPLED",
    driftState: drift.state,
    driftReasons: drift.changes,
    lastRecordedTransitionDrift: previousWindowsTransition287(records),
    installedReleaseAttested: false,
    independentlyWitnessed: false,
    signedOwnerConsentVerified: false,
    sourceReportContractApproved: false,
    sourceReportPublished: false,
    masterShellReadiness: "HOLD_INDEPENDENT_FIELD_PROOF_AND_APPROVED_REPORTING_CONTRACT",
    transport: "NO_PUBLISHER_OR_RECEIVER_ACTIVATED",
  } as const;
}
