/** Build 148: bounded, operator-authored field observations. Never a device command or certification. */
export const TRIAL_CASES = [
  { id: "home", section: "Home", label: "Home room health & navigation", check: "Open room and health cards, identify stale readings, and follow a real workspace link." },
  { id: "devices", section: "Devices", label: "Device identities & room mappings", check: "Compare a known physical device with its source identity and room; check missing or duplicate entries." },
  { id: "cameras", section: "Cameras", label: "Private camera events & moving playback", check: "Observe the approved private viewer with a real camera; unavailable media is a hold, never presumed playback." },
  { id: "home_assistant", section: "Devices", label: "Home Assistant scenes & draft eligibility", check: "Inspect an allowlisted entity and a safe preview. Do not issue a scene or physical action as part of this trial." },
  { id: "mqtt", section: "MQTT", label: "MQTT topic source & mapping", check: "Inspect a permitted topic and its provenance. Do not publish a test command or expose payload secrets." },
  { id: "workshop", section: "Workshop", label: "Workshop maintenance & safety holds", check: "Inspect equipment maintenance records and confirm missing inspections remain a no-operation hold." },
  { id: "windows", section: "System", label: "Windows reboot/startup recovery observations", check: "Compare actual installed Windows task and service evidence with the read-only startup console; do not restart services." },
  { id: "accessibility", section: "Home", label: "Phone-width, keyboard & screen reader", check: "Try narrow-screen menu, Ctrl/Cmd+K, visible focus, readable contrast, card help, and an available assistive reader." },
  { id: "private_access", section: "System", label: "Local/private remote access & login", check: "Confirm private LAN or tailnet access on the actual device with a normal signed-in account; no router or port-forward changes." },
] as const;

export type TrialCaseId = (typeof TRIAL_CASES)[number]["id"];
export type TrialOutcome = "passed" | "issue" | "blocked";
export type TrialOwner = "unassigned" | "household_owner" | "workshop_operator" | "camera_operator";
export type TrialFinding = "none" | "offline" | "missing_identity" | "stale_evidence" | "playback_missing" | "accessibility" | "startup" | "permission" | "other";
export type TrialAccess = "unknown" | "local_console" | "private_lan" | "tailnet";
export type SourceState = "online_reported" | "offline_reported" | "unconfigured" | "unavailable";

export interface TrialEnvironment {
  installed_version: string;
  access: TrialAccess;
  installed_windows_witnessed: boolean;
}

export interface TrialSourceReading {
  source: "hub" | "ollama" | "home_assistant" | "mqtt" | "go2rtc";
  state: SourceState;
  read_at: string;
}

export interface TrialObservation {
  case_id: TrialCaseId;
  outcome: TrialOutcome;
  finding: TrialFinding;
  next_owner: TrialOwner;
  observed_at: string;
  witnessed_by_operator: true;
  acknowledged_at: string | null;
}

export interface TrialReceipt {
  kind: "rosevear_owner_field_trial";
  schema_version: 1;
  exported_at: string;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
  source_ci: "VERIFY_SEPARATELY_IN_GITHUB";
  environment: TrialEnvironment;
  source_readings: TrialSourceReading[];
  observations: TrialObservation[];
  summary: TrialSummary;
}

export interface TrialSummary {
  total: number;
  not_tested: number;
  pass_observed: number;
  open_followups: number;
  awaiting_independent_review: number;
  unacknowledged_followups: number;
  field_acceptance: "FIELD_ACCEPTANCE_HOLD";
}

const owners: TrialOwner[] = ["unassigned", "household_owner", "workshop_operator", "camera_operator"];
const outcomes: TrialOutcome[] = ["passed", "issue", "blocked"];
const findings: TrialFinding[] = ["none", "offline", "missing_identity", "stale_evidence", "playback_missing", "accessibility", "startup", "permission", "other"];
const accesses: TrialAccess[] = ["unknown", "local_console", "private_lan", "tailnet"];
const sourceStates: SourceState[] = ["online_reported", "offline_reported", "unconfigured", "unavailable"];
const sourceNames: TrialSourceReading["source"][] = ["hub", "ollama", "home_assistant", "mqtt", "go2rtc"];
const MAX_EVENTS = 250;

export function validateInstalledVersion(input: string): string {
  const value = input.trim();
  if (value && (value.length > 48 || !/^v?\d{1,4}(?:\.\d{1,4}){1,3}(?:[-+._][a-zA-Z0-9]{1,20})?$/.test(value))) {
    throw new Error("Version must look like 0.0.4-build148; do not enter a path, hostname, URL or credential.");
  }
  return value;
}

function safeTimestamp(input: unknown): input is string {
  if (typeof input !== "string" || !/^20\d\d-\d\d-\d\dT/.test(input)) return false;
  const parsed = Date.parse(input);
  return Number.isFinite(parsed) && parsed <= Date.now() + 300_000 && parsed >= Date.parse("2020-01-01T00:00:00Z");
}

export function latestTrialObservations(history: readonly TrialObservation[]): Map<TrialCaseId, TrialObservation> {
  const result = new Map<TrialCaseId, TrialObservation>();
  for (const observation of history) result.set(observation.case_id, observation);
  return result;
}

/** A previously exported API reading must never present as fresh live device proof. */
export function trialSourceIsFresh(reading: TrialSourceReading, now = Date.now()): boolean {
  return Number.isFinite(now) && Date.parse(reading.read_at) <= now && now - Date.parse(reading.read_at) <= 5 * 60_000;
}

export function summarizeOwnerTrial(history: readonly TrialObservation[]): TrialSummary {
  const latest = latestTrialObservations(history);
  let notTested = 0;
  let passed = 0;
  let open = 0;
  let review = 0;
  let unacknowledged = 0;
  for (const item of TRIAL_CASES) {
    const observation = latest.get(item.id);
    if (!observation) { notTested++; continue; }
    if (observation.outcome === "passed") {
      passed++;
      if (history.some(previous => previous.case_id === item.id && previous.outcome !== "passed")) review++;
    } else {
      open++;
      if (!observation.acknowledged_at) unacknowledged++;
    }
  }
  return { total: TRIAL_CASES.length, not_tested: notTested, pass_observed: passed, open_followups: open,
    awaiting_independent_review: review, unacknowledged_followups: unacknowledged, field_acceptance: "FIELD_ACCEPTANCE_HOLD" };
}

export function recordTrialObservation(
  history: readonly TrialObservation[], environment: TrialEnvironment,
  input: { case_id: TrialCaseId; outcome: TrialOutcome; finding: TrialFinding; next_owner: TrialOwner; witnessed: boolean },
  now = new Date().toISOString(),
): TrialObservation[] {
  if (history.length >= MAX_EVENTS) throw new Error("Trial history reached its bounded limit. Export a private receipt before starting another session.");
  if (!TRIAL_CASES.some(item => item.id === input.case_id) || !outcomes.includes(input.outcome) ||
    !findings.includes(input.finding) || !owners.includes(input.next_owner) || !input.witnessed || !safeTimestamp(now)) {
    throw new Error("Select a valid trial case and personally witness an outcome before recording it.");
  }
  if (history.some(previous => previous.case_id === input.case_id && Date.parse(previous.observed_at) > Date.parse(now))) {
    throw new Error("New field observation must not predate this case's recorded history.");
  }
  if (input.outcome === "passed") {
    if (!environment.installed_windows_witnessed || environment.access === "unknown" || !validateInstalledVersion(environment.installed_version)) {
      throw new Error("Record the witnessed installed Windows version and access path before entering a field pass.");
    }
    if (input.finding !== "none") throw new Error("A field pass cannot carry an unresolved finding.");
  } else if (input.finding === "none" || input.next_owner === "unassigned") {
    throw new Error("An issue or blocked trial requires a finding category and named follow-up role.");
  }
  return [...history, { case_id: input.case_id, outcome: input.outcome, finding: input.finding,
    next_owner: input.next_owner, witnessed_by_operator: true, observed_at: now, acknowledged_at: null }];
}

export function acknowledgeTrialFollowup(history: readonly TrialObservation[], caseId: TrialCaseId, now = new Date().toISOString()): TrialObservation[] {
  if (!safeTimestamp(now)) throw new Error("Invalid review time.");
  let latestIndex = -1;
  for (let index = history.length - 1; index >= 0; index--) {
    if (history[index].case_id === caseId) { latestIndex = index; break; }
  }
  if (latestIndex < 0 || history[latestIndex].outcome === "passed") throw new Error("Only an active finding can be acknowledged.");
  return history.map((item, index) => index === latestIndex ? { ...item, acknowledged_at: item.acknowledged_at ?? now } : item);
}

export function createTrialReceipt(environment: TrialEnvironment, readings: readonly TrialSourceReading[], history: readonly TrialObservation[], now = new Date().toISOString()): TrialReceipt {
  if (!safeTimestamp(now)) throw new Error("Invalid export time.");
  return {
    kind: "rosevear_owner_field_trial", schema_version: 1, exported_at: now,
    field_acceptance: "FIELD_ACCEPTANCE_HOLD", source_ci: "VERIFY_SEPARATELY_IN_GITHUB",
    environment: { ...environment, installed_version: validateInstalledVersion(environment.installed_version) },
    source_readings: readings.map(reading => ({ ...reading })),
    observations: history.map(observation => ({ ...observation })),
    summary: summarizeOwnerTrial(history),
  };
}

/** Deliberately reject unknown/unsafe identities and malformed receipts before replacing any browser-session observations. */
export function parseTrialReceipt(raw: string): TrialReceipt {
  if (raw.length > 200_000) throw new Error("Private trial receipt exceeds 200 KB.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("Private trial receipt is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid trial receipt envelope.");
  const data = parsed as Record<string, unknown>;
  if (data.kind !== "rosevear_owner_field_trial" || data.schema_version !== 1 ||
    data.field_acceptance !== "FIELD_ACCEPTANCE_HOLD" || data.source_ci !== "VERIFY_SEPARATELY_IN_GITHUB" || !safeTimestamp(data.exported_at)) {
    throw new Error("Unknown receipt or unsupported field acceptance claim.");
  }
  const env = data.environment as Record<string, unknown> | undefined;
  if (!env || typeof env.installed_version !== "string" || !accesses.includes(env.access as TrialAccess) ||
    typeof env.installed_windows_witnessed !== "boolean") throw new Error("Invalid owner trial environment.");
  const environment: TrialEnvironment = { installed_version: validateInstalledVersion(env.installed_version),
    access: env.access as TrialAccess, installed_windows_witnessed: env.installed_windows_witnessed };
  if (!Array.isArray(data.observations) || data.observations.length > MAX_EVENTS ||
    !Array.isArray(data.source_readings) || data.source_readings.length > 5) throw new Error("Trial evidence is missing or too large.");
  const lastObservedAt = new Map<TrialCaseId, number>();
  const observations: TrialObservation[] = data.observations.map((rawObservation: unknown) => {
    if (!rawObservation || typeof rawObservation !== "object") throw new Error("Malformed trial observation.");
    const o = rawObservation as Record<string, unknown>;
    if (!TRIAL_CASES.some(item => item.id === o.case_id) || !outcomes.includes(o.outcome as TrialOutcome) ||
      !findings.includes(o.finding as TrialFinding) || !owners.includes(o.next_owner as TrialOwner) ||
      o.witnessed_by_operator !== true || !safeTimestamp(o.observed_at) ||
      (o.acknowledged_at !== null && (!safeTimestamp(o.acknowledged_at) || Date.parse(o.acknowledged_at as string) < Date.parse(o.observed_at as string)))) {
      throw new Error("Malformed or unwitnessed trial observation.");
    }
    // Imported passes are historical operator claims, not fresh certification.
    // Fresh pass entry (recordTrialObservation) still requires installed context in this session.
    if (o.outcome === "passed" && o.finding !== "none") {
      throw new Error("A historical pass cannot contain a finding.");
    }
    if (o.outcome !== "passed" && (o.finding === "none" || o.next_owner === "unassigned")) {
      throw new Error("Unassigned or uncategorized trial follow-up.");
    }
    if (o.outcome === "passed" && o.acknowledged_at !== null) throw new Error("A pass cannot be a follow-up acknowledgement.");
    const caseId = o.case_id as TrialCaseId;
    const observedAt = Date.parse(o.observed_at as string);
    if (observedAt < (lastObservedAt.get(caseId) ?? 0) || observedAt > Date.parse(data.exported_at as string) ||
      (o.acknowledged_at && Date.parse(o.acknowledged_at as string) > Date.parse(data.exported_at as string))) {
      throw new Error("Out-of-order or future-dated trial history.");
    }
    lastObservedAt.set(caseId, observedAt);
    return { case_id: o.case_id as TrialCaseId, outcome: o.outcome as TrialOutcome, finding: o.finding as TrialFinding,
      next_owner: o.next_owner as TrialOwner, witnessed_by_operator: true, observed_at: o.observed_at as string,
      acknowledged_at: o.acknowledged_at as string | null };
  });
  const readAt = new Set<string>();
  const readings: TrialSourceReading[] = data.source_readings.map((rawReading: unknown) => {
    if (!rawReading || typeof rawReading !== "object") throw new Error("Invalid source snapshot.");
    const reading = rawReading as Record<string, unknown>;
    if (!sourceNames.includes(reading.source as TrialSourceReading["source"]) ||
      !sourceStates.includes(reading.state as SourceState) || !safeTimestamp(reading.read_at) ||
      readAt.has(reading.source as string) || Date.parse(reading.read_at as string) > Date.parse(data.exported_at as string)) {
      throw new Error("Invalid or duplicate source reading.");
    }
    readAt.add(reading.source as string);
    return { source: reading.source as TrialSourceReading["source"], state: reading.state as SourceState, read_at: reading.read_at as string };
  });
  return createTrialReceipt(environment, readings, observations, data.exported_at as string);
}
