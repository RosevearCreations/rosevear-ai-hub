/** Build 149: private, operator-authored repair preparation. No automatic closure or execution. */
import {
  TRIAL_CASES, createTrialReceipt, parseTrialReceipt,
  type TrialCaseId, type TrialEnvironment, type TrialFinding, type TrialObservation,
  type TrialOwner, type TrialReceipt, type TrialSourceReading,
} from "./ownerFieldTrial";

export type FindingSeverity = "high" | "moderate" | "low";
export type HandoffStage = "draft" | "owner_reviewed" | "prepared_for_private_handoff";
export type ComparisonState = "awaiting_retest" | "still_open" | "changed_finding" | "owner_improvement_review_hold";

export interface ReconciledFinding {
  case_id: TrialCaseId;
  section: string;
  label: string;
  severity: FindingSeverity;
  next_owner: Exclude<TrialOwner, "unassigned">;
  first_observed_at: string;
  baseline_index: number;
  baseline_observed_at: string;
  finding: Exclude<TrialFinding, "none">;
  occurrence_count: number;
  comparison: ComparisonState;
  retest_observed_at: string | null;
}

export interface RepairHandoff {
  case_id: TrialCaseId;
  baseline_index: number;
  severity: FindingSeverity;
  next_owner: Exclude<TrialOwner, "unassigned">;
  stage: HandoffStage;
  created_at: string;
  reviewed_at: string | null;
  prepared_at: string | null;
}

export interface TrialReconciliationReceipt {
  kind: "rosevear_owner_trial_reconciliation";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  independent_review: "INDEPENDENT_REVIEW_HOLD";
  trial: TrialReceipt;
  handoffs: RepairHandoff[];
}

export const REPAIR_GUIDANCE: Record<TrialCaseId, string> = {
  home: "Compare the room source timestamps and existing navigation; capture the discrepancy offline for a manual UI or source fix.",
  devices: "Compare source IDs and room mappings without joining, re-pairing or renaming a physical device.",
  cameras: "Verify the approved viewer and media identity manually; do not expose stream URLs or change retention.",
  home_assistant: "Inspect allowlisted entity and scene previews only; do not execute a scene to prove repair.",
  mqtt: "Inspect approved topic metadata and mapping provenance; do not publish test payloads or broker commands.",
  workshop: "Inspect maintenance records and safety holds; do not operate or certify workshop equipment.",
  windows: "Compare local startup task evidence and service logs manually; do not restart or reconfigure services from this workbench.",
  accessibility: "Reproduce the issue with keyboard, screen reader or narrow viewport and route the interface finding for review.",
  private_access: "Check the approved private sign-in path manually; do not change firewall, router or public exposure.",
};

/** Coarse triage only, never a safety assessment or permission to use equipment. */
export function findingSeverity(finding: TrialFinding): FindingSeverity {
  if (["startup", "permission", "playback_missing"].includes(finding)) return "high";
  if (["missing_identity", "offline", "accessibility", "stale_evidence"].includes(finding)) return "moderate";
  return "low";
}

export function reconcileTrialFindings(history: readonly TrialObservation[]): ReconciledFinding[] {
  const result: ReconciledFinding[] = [];
  for (const trialCase of TRIAL_CASES) {
    const entries = history.map((observation, index) => ({ observation, index }))
      .filter(entry => entry.observation.case_id === trialCase.id);
    const failures = entries.filter(entry => entry.observation.outcome !== "passed");
    if (failures.length === 0) continue;
    const baseline = failures[failures.length - 1];
    const latest = entries[entries.length - 1];
    const comparison: ComparisonState = latest.index === baseline.index ? "awaiting_retest"
      : latest.observation.outcome === "passed" ? "owner_improvement_review_hold"
      : latest.observation.finding === baseline.observation.finding ? "still_open" : "changed_finding";
    result.push({
      case_id: trialCase.id, section: trialCase.section, label: trialCase.label,
      severity: findingSeverity(baseline.observation.finding),
      next_owner: baseline.observation.next_owner as Exclude<TrialOwner, "unassigned">,
      first_observed_at: failures[0].observation.observed_at,
      baseline_index: baseline.index, baseline_observed_at: baseline.observation.observed_at,
      finding: baseline.observation.finding as Exclude<TrialFinding, "none">,
      occurrence_count: failures.length, comparison,
      retest_observed_at: latest.index === baseline.index ? null : latest.observation.observed_at,
    });
  }
  return result.sort((a, b) => a.section.localeCompare(b.section) ||
    ({ high: 0, moderate: 1, low: 2 }[a.severity] - { high: 0, moderate: 1, low: 2 }[b.severity]) ||
    a.label.localeCompare(b.label));
}

/** Compare the exact handed-off issue against later source-order observations, not a newly selected baseline. */
export function compareRepairHandoff(history: readonly TrialObservation[], handoff: RepairHandoff): {
  state: ComparisonState; latest_observed_at: string | null; latest_finding: TrialFinding | null;
} {
  const later = history.slice(handoff.baseline_index + 1).filter(item => item.case_id === handoff.case_id);
  const latest = later[later.length - 1];
  const original = history[handoff.baseline_index];
  if (!latest || !original) return { state: "awaiting_retest", latest_observed_at: null, latest_finding: null };
  return { state: latest.outcome === "passed" ? "owner_improvement_review_hold"
    : latest.finding === original.finding ? "still_open" : "changed_finding",
  latest_observed_at: latest.observed_at, latest_finding: latest.finding };
}

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") &&
    Date.parse(value) <= Date.now() + 300_000;
}

const MAX_HANDOFFS = 100;
function validateHandoffs(handoffs: readonly RepairHandoff[], history: readonly TrialObservation[], exportedAt?: string) {
  if (handoffs.length > MAX_HANDOFFS) throw new Error("Repair handoffs have reached their 100-record bound.");
  const seen = new Set<string>();
  for (const handoff of handoffs) {
    if (!handoff || typeof handoff !== "object" ||
      Object.keys(handoff).some(key => !["case_id", "baseline_index", "severity", "next_owner", "stage", "created_at", "reviewed_at", "prepared_at"].includes(key)) ||
      !Number.isInteger(handoff.baseline_index) || handoff.baseline_index < 0) {
      throw new Error("Invalid or unsafe repair handoff record.");
    }
    const original = history[handoff.baseline_index];
    if (!original || original.case_id !== handoff.case_id || original.outcome === "passed" ||
      !TRIAL_CASES.some(entry => entry.id === handoff.case_id) ||
      handoff.severity !== findingSeverity(original.finding) ||
      handoff.next_owner !== original.next_owner ||
      !["draft", "owner_reviewed", "prepared_for_private_handoff"].includes(handoff.stage) ||
      !safeTime(handoff.created_at) || Date.parse(handoff.created_at) < Date.parse(original.observed_at) ||
      (exportedAt && Date.parse(handoff.created_at) > Date.parse(exportedAt)) ||
      (handoff.reviewed_at !== null && (!safeTime(handoff.reviewed_at) || Date.parse(handoff.reviewed_at) < Date.parse(handoff.created_at) ||
        (exportedAt && Date.parse(handoff.reviewed_at) > Date.parse(exportedAt)))) ||
      (handoff.prepared_at !== null && (!safeTime(handoff.prepared_at) || handoff.reviewed_at === null ||
        Date.parse(handoff.prepared_at) < Date.parse(handoff.reviewed_at) ||
        (exportedAt && Date.parse(handoff.prepared_at) > Date.parse(exportedAt)))) ||
      (handoff.stage === "draft" && (handoff.reviewed_at !== null || handoff.prepared_at !== null)) ||
      (handoff.stage === "owner_reviewed" && (handoff.reviewed_at === null || handoff.prepared_at !== null)) ||
      (handoff.stage === "prepared_for_private_handoff" && handoff.prepared_at === null)) {
      throw new Error("Invalid, out-of-order or unsubstantiated repair handoff.");
    }
    const key = `${handoff.case_id}:${handoff.baseline_index}`;
    if (seen.has(key)) throw new Error("Duplicate handoff for the same trial finding.");
    seen.add(key);
  }
}

export function createRepairHandoff(history: readonly TrialObservation[], handoffs: readonly RepairHandoff[],
  caseId: TrialCaseId, now = new Date().toISOString()): RepairHandoff[] {
  const finding = reconcileTrialFindings(history).find(item => item.case_id === caseId);
  if (!finding || !safeTime(now) || Date.parse(now) < Date.parse(finding.baseline_observed_at))
    throw new Error("A witnessed issue or block is required before drafting a repair handoff.");
  const next = [...handoffs, { case_id: caseId, baseline_index: finding.baseline_index,
    severity: finding.severity, next_owner: finding.next_owner, stage: "draft" as const,
    created_at: now, reviewed_at: null, prepared_at: null }];
  validateHandoffs(next, history);
  return next;
}

export function advanceRepairHandoff(history: readonly TrialObservation[], handoffs: readonly RepairHandoff[],
  caseId: TrialCaseId, baselineIndex: number, witnessed: boolean, now = new Date().toISOString()): RepairHandoff[] {
  if (!witnessed || !safeTime(now)) throw new Error("Explicit owner review is required; no handoff is sent automatically.");
  const current = handoffs.find(item => item.case_id === caseId && item.baseline_index === baselineIndex);
  if (!current || current.stage === "prepared_for_private_handoff") throw new Error("There is no pending handoff stage to advance.");
  const next = handoffs.map(item => item === current ? {
    ...item, stage: current.stage === "draft" ? "owner_reviewed" as const : "prepared_for_private_handoff" as const,
    reviewed_at: current.reviewed_at ?? now,
    prepared_at: current.stage === "owner_reviewed" ? now : null,
  } : item);
  validateHandoffs(next, history);
  return next;
}

export function createReconciliationReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], now = new Date().toISOString()): TrialReconciliationReceipt {
  if (!safeTime(now)) throw new Error("Invalid reconciliation export time.");
  validateHandoffs(handoffs, history, now);
  return { kind: "rosevear_owner_trial_reconciliation", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
    trial: createTrialReceipt(environment, readings, history, now), handoffs: handoffs.map(item => ({ ...item })) };
}

/** Reads both the original Build 148 receipt and the opt-in Build 149 wrapper. No imported evidence becomes live. */
export function parseReconciliationReceipt(raw: string): { trial: TrialReceipt; handoffs: RepairHandoff[] } {
  if (raw.length > 260_000) throw new Error("Private reconciliation receipt exceeds 260 KB.");
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new Error("Private reconciliation receipt is not valid JSON."); }
  if (!data || typeof data !== "object") throw new Error("Invalid reconciliation receipt envelope.");
  const envelope = data as Record<string, unknown>;
  if (envelope.kind === "rosevear_owner_field_trial") return { trial: parseTrialReceipt(raw), handoffs: [] };
  if (envelope.kind !== "rosevear_owner_trial_reconciliation" || envelope.schema_version !== 1 ||
    envelope.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || envelope.independent_review !== "INDEPENDENT_REVIEW_HOLD" ||
    !safeTime(envelope.exported_at) || !envelope.trial || typeof envelope.trial !== "object" ||
    !Array.isArray(envelope.handoffs)) throw new Error("Unsupported reconciliation receipt or acceptance claim.");
  const trial = parseTrialReceipt(JSON.stringify(envelope.trial));
  if (Date.parse(trial.exported_at) > Date.parse(envelope.exported_at)) throw new Error("Trial history postdates the reconciliation export.");
  // Validate without trusting the imported stage or operator claim as a real-world verification.
  const handoffs = envelope.handoffs as RepairHandoff[];
  validateHandoffs(handoffs, trial.observations, envelope.exported_at as string);
  return { trial, handoffs: handoffs.map(item => ({ ...item })) };
}
