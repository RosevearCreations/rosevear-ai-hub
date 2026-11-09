import { hubModuleEstimates } from "./masterShellReadiness283";

/** Local, owner-reported observations. No result is a signed or independent field acceptance. */
export type OwnerFieldOutcome = "owner_reported_working" | "owner_reported_problem";
export type FieldFreshness = "NO_OBSERVATION" | "CURRENT_OWNER_REPORT" | "STALE_OWNER_REPORT" | "CLOCK_CHECK";
export type OwnerFieldObservation = Readonly<{
  moduleId: string;
  outcome: OwnerFieldOutcome;
  observedAtMs: number;
}>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const VERSION = 1;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLOCK_LEEWAY_MS = 5 * 60 * 1000;
const MAX_SERIALIZED_LENGTH = 20_000;
const validIds = new Set(hubModuleEstimates.filter(module => module.percent !== null).map(module => module.id));
const validOutcomes = new Set<OwnerFieldOutcome>(["owner_reported_working", "owner_reported_problem"]);

export function ownerFieldStorageKey(ownerId: string): string | null {
  const id = ownerId.trim();
  if (!id || id.length > 120 || /[\u0000-\u001f\u007f]/u.test(id)) return null;
  return `hub-master-shell-owner-field-v${VERSION}:${encodeURIComponent(id)}`;
}

function validObservation(value: unknown): OwnerFieldObservation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.moduleId !== "string" || !validIds.has(record.moduleId)) return null;
  if (typeof record.outcome !== "string" || !validOutcomes.has(record.outcome as OwnerFieldOutcome)) return null;
  if (typeof record.observedAtMs !== "number" || !Number.isSafeInteger(record.observedAtMs) || record.observedAtMs < 0) return null;
  return { moduleId: record.moduleId, outcome: record.outcome as OwnerFieldOutcome, observedAtMs: record.observedAtMs };
}

export function loadOwnerFieldObservations(storage: StorageLike | null, ownerId: string): OwnerFieldObservation[] {
  const key = ownerFieldStorageKey(ownerId);
  if (!storage || !key) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > MAX_SERIALIZED_LENGTH) return [];
    const decoded: unknown = JSON.parse(raw);
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) return [];
    const record = decoded as Record<string, unknown>;
    if (record.version !== VERSION || !Array.isArray(record.observations)) return [];
    const deduplicated = new Map<string, OwnerFieldObservation>();
    for (const candidate of record.observations.slice(0, validIds.size)) {
      const observation = validObservation(candidate);
      if (!observation || deduplicated.has(observation.moduleId)) continue;
      deduplicated.set(observation.moduleId, observation);
    }
    return [...deduplicated.values()];
  } catch { return []; }
}

/** Explicit owner input only. Keeps a bounded, allowlisted, versioned local payload. */
export function saveOwnerFieldObservation(
  storage: StorageLike | null, ownerId: string, existing: readonly OwnerFieldObservation[],
  moduleId: string, outcome: OwnerFieldOutcome | null, nowMs: number,
): { saved: boolean; observations: OwnerFieldObservation[] } {
  const key = ownerFieldStorageKey(ownerId);
  if (!storage || !key || !validIds.has(moduleId) || !Number.isSafeInteger(nowMs) || nowMs < 0 || (outcome !== null && !validOutcomes.has(outcome))) {
    return { saved: false, observations: [...existing] };
  }
  const next = existing.map(validObservation).filter((item): item is OwnerFieldObservation => item !== null && item.moduleId !== moduleId);
  if (outcome) next.push({ moduleId, outcome, observedAtMs: nowMs });
  const observations = next.slice(-validIds.size);
  try {
    storage.setItem(key, JSON.stringify({ version: VERSION, observations }));
    return { saved: true, observations };
  } catch { return { saved: false, observations: [...existing] }; }
}

export function fieldFreshness(observation: OwnerFieldObservation | undefined, nowMs: number): FieldFreshness {
  if (!observation) return "NO_OBSERVATION";
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || observation.observedAtMs > nowMs + CLOCK_LEEWAY_MS) return "CLOCK_CHECK";
  return nowMs - observation.observedAtMs > RETENTION_MS ? "STALE_OWNER_REPORT" : "CURRENT_OWNER_REPORT";
}

export function fieldEvidencePreflight(observations: readonly OwnerFieldObservation[], nowMs: number) {
  const byModule = new Map(observations.map(observation => [observation.moduleId, observation]));
  const applicable = hubModuleEstimates.filter(module => module.percent !== null);
  const freshness = applicable.map(module => fieldFreshness(byModule.get(module.id), nowMs));
  return {
    applicableModuleCount: applicable.length,
    missing: freshness.filter(state => state === "NO_OBSERVATION").length,
    currentOwnerReports: freshness.filter(state => state === "CURRENT_OWNER_REPORT").length,
    stale: freshness.filter(state => state === "STALE_OWNER_REPORT").length,
    clockCheck: freshness.filter(state => state === "CLOCK_CHECK").length,
    reportedIssues: applicable.filter(module => byModule.get(module.id)?.outcome === "owner_reported_problem").length,
    independentlyVerifiedModules: 0,
    status: "BLOCKED_INDEPENDENT_FIELD_PROOF_AND_SHARED_CONTRACT_PENDING" as const,
    transmission: "NOT_CONFIGURED" as const,
  };
}

/** Local candidate only; excludes owner identity, credentials, comments, URLs and raw devices. */
export function fieldEvidenceReportPreview(observations: readonly OwnerFieldObservation[], nowMs: number) {
  const records = new Map(observations.map(record => [record.moduleId, record]));
  return {
    schema: "rosevear.ai-hub.owner-field-preflight-candidate.v0",
    status: "LOCAL_PREVIEW_NOT_SENT",
    appId: "rosevear-ai-hub",
    deploymentEvidence: "NOT_INDEPENDENTLY_VERIFIED",
    preflight: fieldEvidencePreflight(observations, nowMs),
    moduleObservations: hubModuleEstimates.filter(module => module.percent !== null).map(module => {
      const observation = records.get(module.id);
      return {
        moduleId: module.id,
        observedOutcome: observation?.outcome ?? null,
        freshness: fieldFreshness(observation, nowMs),
        independentAcceptance: "NOT_VERIFIED" as const,
      };
    }),
  };
}
