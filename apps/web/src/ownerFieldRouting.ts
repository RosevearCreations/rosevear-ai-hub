/** Build 151: owner-observed, privacy-safe source change signals. Never device identity attestation or field acceptance. */
import { TRIAL_CASES, validateInstalledVersion,
  type TrialAccess, type TrialCaseId, type TrialEnvironment, type TrialObservation, type TrialOwner,
  type TrialSourceReading } from "./ownerFieldTrial";
import { type RepairHandoff } from "./ownerTrialReconciliation";
import { assessIndependentEvidence, createIndependentReviewReceipt, parseIndependentReviewReceipt,
  type IndependentReviewReceipt, type ReviewEvidenceEvent } from "./ownerIndependentReview";

export const MANUAL_ROUTES: Record<TrialCaseId, { section: string; role: Exclude<TrialOwner, "unassigned">; source: string; instruction: string }> = {
  home: { section: "Home", role: "household_owner", source: "Room/Hub", instruction: "Inspect the exact room source, observed timestamp and existing Home navigation." },
  devices: { section: "Devices", role: "household_owner", source: "Device", instruction: "Compare the approved physical device and its source identity in Devices. Do not re-pair." },
  cameras: { section: "Cameras", role: "camera_operator", source: "Camera", instruction: "Check the approved camera identity and actual moving playback privately. Do not reveal stream URLs." },
  home_assistant: { section: "Devices", role: "household_owner", source: "HA entity", instruction: "Inspect the allowlisted Home Assistant entity and preview only; never trigger a scene." },
  mqtt: { section: "MQTT", role: "household_owner", source: "MQTT source", instruction: "Compare approved topic metadata in MQTT; do not publish a command or copy payloads." },
  workshop: { section: "Workshop", role: "workshop_operator", source: "Equipment", instruction: "Verify the physical equipment record and maintenance hold; never operate or certify it here." },
  windows: { section: "System", role: "household_owner", source: "Windows startup", instruction: "Reinspect the actual installed version, task and services read-only; do not restart them." },
  accessibility: { section: "Home", role: "household_owner", source: "UI path", instruction: "Reproduce the exact keyboard, screen reader or phone-width flow without changing controls." },
  private_access: { section: "System", role: "household_owner", source: "Access path", instruction: "Check the signed-in private access path. Do not alter firewall, router or public exposure." },
};

export type SourceIdentityState = "confirmed_alias" | "identity_unknown" | "operator_mismatch";
export interface SourceIdentityCheck {
  case_id: TrialCaseId;
  trial_index: number;
  identity_state: SourceIdentityState;
  safe_alias: string | null;
  installed_version: string;
  access: Exclude<TrialAccess, "unknown">;
  captured_at: string;
  witnessed_on_windows: true;
}
export type RouteReason = "NO_OWNER_TRIAL" | "HISTORICAL_OWNER_TRIAL" | "WINDOWS_CONTEXT_UNKNOWN" |
  "NO_IDENTITY_EVIDENCE" | "IMPORTED_IDENTITY_HISTORICAL" | "IDENTITY_UNKNOWN" | "SOURCE_IDENTITY_MISMATCH" |
  "SOURCE_ALIAS_CHANGED" | "IDENTITY_SNAPSHOT_STALE" | "INSTALLED_VERSION_SUPERSEDED" |
  "REOPENED_AFTER_PASS" | "ACTIVE_FINDING" | "INDEPENDENT_EVIDENCE_GAPS";
export interface RepeatTrialRoute {
  case_id: TrialCaseId;
  label: string;
  section: string;
  source: string;
  recommended_owner: Exclude<TrialOwner, "unassigned">;
  instruction: string;
  reasons: RouteReason[];
  priority: "REPEAT_TRIAL_REQUIRED" | "EVIDENCE_INTAKE_REQUIRED";
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}
export interface FieldRoutingReceipt {
  kind: "rosevear_owner_source_identity_routing";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  automatic_dispatch: "DISABLED";
  closure: "NOT_AUTHORIZED";
  identity_authenticity: "UNVERIFIED_OWNER_SAFE_ALIASES";
  independent_review: IndependentReviewReceipt;
  source_checks: SourceIdentityCheck[];
}

const states: SourceIdentityState[] = ["confirmed_alias", "identity_unknown", "operator_mismatch"];
const accesses: Exclude<TrialAccess, "unknown">[] = ["local_console", "private_lan", "tailnet"];
const MAX_CHECKS = 180;
const SAFE_ALIAS = /^asset_[a-z0-9]{6,12}$/;
const CHECK_KEYS = ["case_id", "trial_index", "identity_state", "safe_alias", "installed_version", "access", "captured_at", "witnessed_on_windows"];

function safeTime(value: unknown): value is string {
  return typeof value === "string" && /^20\d\d-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value)) &&
    Date.parse(value) >= Date.parse("2020-01-01T00:00:00Z") && Date.parse(value) <= Date.now() + 300_000;
}

function latestIndex(history: readonly TrialObservation[], caseId: TrialCaseId): number {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].case_id === caseId) return i;
  return -1;
}

function verifyChecks(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[], exportedAt?: string) {
  if (checks.length > MAX_CHECKS) throw new Error("Source identity evidence has reached its 180-record bound.");
  const lastTime = new Map<TrialCaseId, number>();
  for (const check of checks) {
    if (!check || typeof check !== "object" || Object.keys(check).some(key => !CHECK_KEYS.includes(key)) ||
      !Object.hasOwn(MANUAL_ROUTES, check.case_id) || !Number.isInteger(check.trial_index) ||
      !states.includes(check.identity_state) || !accesses.includes(check.access) || check.witnessed_on_windows !== true ||
      !safeTime(check.captured_at) || typeof check.installed_version !== "string" ||
      !validateInstalledVersion(check.installed_version) ||
      (check.identity_state === "identity_unknown" ? check.safe_alias !== null : typeof check.safe_alias !== "string" || !SAFE_ALIAS.test(check.safe_alias))) {
      throw new Error("Invalid or sensitive source identity evidence; use a made-up asset_ alias only.");
    }
    const trial = history[check.trial_index];
    const timestamp = Date.parse(check.captured_at);
    if (!trial || trial.case_id !== check.case_id || timestamp < Date.parse(trial.observed_at) ||
      timestamp < (lastTime.get(check.case_id) ?? 0) || (exportedAt && timestamp > Date.parse(exportedAt))) {
      throw new Error("Source identity evidence conflicts with the original trial or chronology.");
    }
    lastTime.set(check.case_id, timestamp);
  }
}

/** A match is only a manually recorded pseudonym; it NEVER proves the same physical device. */
export function recordSourceIdentityCheck(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  environment: TrialEnvironment, input: { case_id: TrialCaseId; identity_state: SourceIdentityState;
    safe_alias: string; personally_witnessed: boolean }, now = new Date().toISOString()): SourceIdentityCheck[] {
  const trial_index = latestIndex(history, input.case_id);
  if (!input.personally_witnessed || trial_index < 0 || !states.includes(input.identity_state) || !safeTime(now)) {
    throw new Error("Record a trial observation and personally witness this exact source before capturing identity evidence.");
  }
  if (!environment.installed_windows_witnessed || environment.access === "unknown" || !validateInstalledVersion(environment.installed_version)) {
    throw new Error("Personally verify the installed Windows version and private access before source identity intake.");
  }
  const alias = input.identity_state === "identity_unknown" ? null : input.safe_alias.trim();
  if (alias !== null && !SAFE_ALIAS.test(alias)) {
    throw new Error("Use a non-sensitive made-up token such as asset_ab12cd; never enter a real device ID, IP, serial or hostname.");
  }
  const next = [...checks, { case_id: input.case_id, trial_index, identity_state: input.identity_state,
    safe_alias: alias, installed_version: validateInstalledVersion(environment.installed_version),
    access: environment.access as Exclude<TrialAccess, "unknown">, captured_at: now, witnessed_on_windows: true as const }];
  verifyChecks(history, next);
  return next;
}

/** Always returns HOLD routes, never a passed physical identity or automatic repair decision. */
export function deriveRepeatTrialRoutes(history: readonly TrialObservation[], checks: readonly SourceIdentityCheck[],
  environment: TrialEnvironment, handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  imported: { trials: number; checks: number; reviews: number } = { trials: 0, checks: 0, reviews: 0 }): RepeatTrialRoute[] {
  return TRIAL_CASES.map(item => {
    const route = MANUAL_ROUTES[item.id];
    const idx = latestIndex(history, item.id);
    const current = history[idx];
    const matching = checks.map((check, index) => ({ check, index })).filter(entry => entry.check.case_id === item.id);
    const latest = matching.at(-1);
    const previousConfirmed = matching.slice(0, -1).reverse().find(entry => entry.check.identity_state === "confirmed_alias");
    const reasons: RouteReason[] = [];
    if (idx < 0) reasons.push("NO_OWNER_TRIAL");
    else if (idx < imported.trials) reasons.push("HISTORICAL_OWNER_TRIAL");
    if (!environment.installed_windows_witnessed || environment.access === "unknown" || !environment.installed_version ||
      (() => { try { return !validateInstalledVersion(environment.installed_version); } catch { return true; } })()) {
      reasons.push("WINDOWS_CONTEXT_UNKNOWN");
    }
    if (!latest) reasons.push("NO_IDENTITY_EVIDENCE");
    else {
      if (latest.index < imported.checks) reasons.push("IMPORTED_IDENTITY_HISTORICAL");
      if (latest.check.identity_state === "identity_unknown") reasons.push("IDENTITY_UNKNOWN");
      // An owner-observed contradiction cannot be cleared by selecting "confirmed" again
      // against the same trial; a new witnessed trial is required first.
      if (matching.some(entry => entry.check.trial_index === idx && entry.check.identity_state === "operator_mismatch")) {
        reasons.push("SOURCE_IDENTITY_MISMATCH");
      }
      const sameTrialAliases = new Set(matching.filter(entry => entry.check.trial_index === idx && entry.check.safe_alias)
        .map(entry => entry.check.safe_alias));
      // Multiple markers against one physical trial are contradictory even if later toggles revert the marker.
      if (sameTrialAliases.size > 1 ||
        (previousConfirmed && latest.check.safe_alias && previousConfirmed.check.safe_alias !== latest.check.safe_alias)) {
        reasons.push("SOURCE_ALIAS_CHANGED");
      }
      if (latest.check.trial_index !== idx) reasons.push("IDENTITY_SNAPSHOT_STALE");
      if ((environment.installed_version && latest.check.installed_version !== environment.installed_version) ||
        (previousConfirmed && previousConfirmed.check.installed_version !== latest.check.installed_version)) {
        reasons.push("INSTALLED_VERSION_SUPERSEDED");
      }
    }
    if (idx >= 0 && current.outcome !== "passed") {
      if (history.slice(0, idx).some(previous => previous.case_id === item.id && previous.outcome === "passed")) reasons.push("REOPENED_AFTER_PASS");
      reasons.push("ACTIVE_FINDING");
    }
    const prepared = handoffs.filter(handoff => handoff.case_id === item.id && handoff.stage === "prepared_for_private_handoff").at(-1);
    if (prepared && assessIndependentEvidence(history, prepared, reviews, environment, imported.reviews, imported.trials).packet_readiness !== "REVIEW_PACKET_PREPARED_ONLY") {
      reasons.push("INDEPENDENT_EVIDENCE_GAPS");
    }
    const repeat = reasons.some(reason => ["SOURCE_IDENTITY_MISMATCH", "SOURCE_ALIAS_CHANGED", "INSTALLED_VERSION_SUPERSEDED", "REOPENED_AFTER_PASS", "IDENTITY_SNAPSHOT_STALE"].includes(reason));
    return { case_id: item.id, label: item.label, section: route.section, source: route.source,
      recommended_owner: current && current.outcome !== "passed" && current.next_owner !== "unassigned"
        ? current.next_owner : route.role,
      instruction: route.instruction, reasons, priority: repeat ? "REPEAT_TRIAL_REQUIRED" as const : "EVIDENCE_INTAKE_REQUIRED" as const,
      field_acceptance: "FIELD_ACCEPTANCE_HOLD" as const };
  }).sort((a, b) => Number(b.priority === "REPEAT_TRIAL_REQUIRED") - Number(a.priority === "REPEAT_TRIAL_REQUIRED") || a.label.localeCompare(b.label));
}

export function createFieldRoutingReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[],
  history: readonly TrialObservation[], handoffs: readonly RepairHandoff[], reviews: readonly ReviewEvidenceEvent[],
  checks: readonly SourceIdentityCheck[], now = new Date().toISOString()): FieldRoutingReceipt {
  if (!safeTime(now)) throw new Error("Invalid source routing export time.");
  verifyChecks(history, checks, now);
  return { kind: "rosevear_owner_source_identity_routing", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", automatic_dispatch: "DISABLED", closure: "NOT_AUTHORIZED",
    identity_authenticity: "UNVERIFIED_OWNER_SAFE_ALIASES",
    independent_review: createIndependentReviewReceipt(environment, readings, history, handoffs, reviews, now),
    source_checks: checks.map(check => ({ ...check })) };
}

export function parseFieldRoutingReceipt(raw: string): { trial: IndependentReviewReceipt["reconciliation"]["trial"];
  handoffs: RepairHandoff[]; events: ReviewEvidenceEvent[]; checks: SourceIdentityCheck[] } {
  if (raw.length > 460_000) throw new Error("Private Build 151 source routing receipt exceeds 460 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Private routing receipt is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid source routing receipt.");
  const receipt = parsed as Record<string, unknown>;
  if (receipt.kind !== "rosevear_owner_source_identity_routing") {
    const prior = parseIndependentReviewReceipt(raw);
    return { ...prior, checks: [] };
  }
  const allowed = ["kind", "schema_version", "exported_at", "field_acceptance", "automatic_dispatch", "closure",
    "identity_authenticity", "independent_review", "source_checks"];
  if (Object.keys(receipt).some(key => !allowed.includes(key)) || receipt.schema_version !== 1 ||
    receipt.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || receipt.automatic_dispatch !== "DISABLED" ||
    receipt.closure !== "NOT_AUTHORIZED" || receipt.identity_authenticity !== "UNVERIFIED_OWNER_SAFE_ALIASES" ||
    !safeTime(receipt.exported_at) || !Array.isArray(receipt.source_checks) ||
    !receipt.independent_review || typeof receipt.independent_review !== "object") {
    throw new Error("Unsupported source routing receipt or unsafe field acceptance claim.");
  }
  const inner = receipt.independent_review as IndependentReviewReceipt;
  if (inner.kind !== "rosevear_owner_independent_review") {
    throw new Error("Build 151 requires the complete validated Build 150 independent review wrapper.");
  }
  const prior = parseIndependentReviewReceipt(JSON.stringify(inner));
  if (Date.parse(inner.exported_at) > Date.parse(receipt.exported_at as string)) {
    throw new Error("Source routing receipt predates its independent review history.");
  }
  const checks = receipt.source_checks as SourceIdentityCheck[];
  verifyChecks(prior.trial.observations, checks, receipt.exported_at as string);
  return { ...prior, checks: checks.map(check => ({ ...check })) };
}
