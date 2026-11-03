/** Build 237: source-bound, owner-entered visual retests. Never independent acceptance or repair permission. */
import type { ShellTheme } from "./CommandShell";
import { safeWindowsFieldReference, safeWindowsInstalledVersion } from "./windowsFieldAcceptance228";
import { summarizeAppearance236, type Appearance236Draft, type Appearance236Scope,
  type Appearance236Symptom, type Appearance236Viewport } from "./windowsAppearanceAcceptance236";

export type Visual237Outcome = "not_tested" | "pass" | "finding" | "blocked";
export type Visual237Disposition = "pending" | "request_retest" | "defer" | "request_ui_review";
export type Visual237RepairArea = "unselected" | "theme_tokens" | "navigation_layout" |
  "color_contrast" | "focus_control" | "preference_persistence";
export type Visual237Entry = {
  retestOutcome: Visual237Outcome;
  retestViewport: Appearance236Viewport;
  retestSymptom: Appearance236Symptom;
  retestReference: string;
  retestWitnessed: boolean;
  retestAt: string;
  retestKey: string;
  disposition: Visual237Disposition;
  repairArea: Visual237RepairArea;
  decisionReference: string;
  decisionAttested: boolean;
  decisionAt: string;
  decisionKey: string;
};
export type Visual237Draft = Record<string, Visual237Entry | undefined>;

export const defaultVisual237Entry: Visual237Entry = {
  retestOutcome: "not_tested", retestViewport: "unselected", retestSymptom: "none",
  retestReference: "", retestWitnessed: false, retestAt: "", retestKey: "",
  disposition: "pending", repairArea: "unselected", decisionReference: "",
  decisionAttested: false, decisionAt: "", decisionKey: "",
};

export type Visual237Gate = "source_stale" | "retest_not_tested" | "witness_gap" |
  "viewport_gap" | "viewport_mismatch" | "evidence_gap" | "duplicate_reference" |
  "symptom_gap" | "retest_stale" | "owner_retest_pass" | "retest_blocked" |
  "different_symptom" | "open_finding" | "repair_scope_gap" | "decision_evidence_gap" |
  "decision_witness_gap" | "decision_stale" | "retest_requested" | "owner_deferred" |
  "review_ready";

export const visual237GateLabels: Record<Visual237Gate, string> = {
  source_stale: "Build 236 source evidence is stale or incomplete",
  retest_not_tested: "No installed-Windows retest recorded",
  witness_gap: "Owner must witness actual installed-Windows retest",
  viewport_gap: "Actual Windows retest viewport required",
  viewport_mismatch: "Retest viewport differs; reconcile the source first",
  evidence_gap: "Enter a safe distinct retest evidence code",
  duplicate_reference: "Evidence code duplicated across Build 236/237",
  symptom_gap: "Classify the retest finding or blocker",
  retest_stale: "Record a fresh owner retest for the current source snapshot",
  owner_retest_pass: "Owner-reported retest pass; source finding remains open",
  retest_blocked: "Retest blocked; source finding remains open",
  different_symptom: "Different symptom; requires a separate source finding",
  open_finding: "Finding still open; choose an owner disposition",
  repair_scope_gap: "Choose the matching UI-only area before requesting review",
  decision_evidence_gap: "New distinct disposition evidence code required",
  decision_witness_gap: "Separate owner decision acknowledgment required",
  decision_stale: "Record the separate owner disposition for this exact retest",
  retest_requested: "Another retest requested; finding remains open",
  owner_deferred: "Owner deferred; finding remains open",
  review_ready: "UI-only review request ready; repair is NOT authorized",
};

const eligibleSourceGates = new Set([
  "open_finding", "followup_gap", "followup_consent_gap", "followup_stale",
  "retest_requested", "owner_deferred", "review_requested",
]);

const matchingAreas: Partial<Record<Appearance236Symptom, Visual237RepairArea>> = {
  glare: "theme_tokens", contrast: "color_contrast", clipping: "navigation_layout",
  keyboard: "focus_control", persistence: "preference_persistence",
};

export type Visual237SourceRow = ReturnType<typeof summarizeAppearance236>["rows"][number];

export function visual237SourceKey(row: Visual237SourceRow): string {
  return JSON.stringify({ id: row.id, observationKey: row.entry.observedKey,
    observedAt: row.entry.observedAt, reference: row.entry.reference,
    viewport: row.entry.viewport, symptom: row.entry.symptom, outcome: row.entry.outcome });
}

export function visual237RetestKey(theme: ShellTheme, scope: Appearance236Scope,
  row: Visual237SourceRow, entry: Visual237Entry): string {
  return JSON.stringify({ source: visual237SourceKey(row), theme,
    installedVersion: safeWindowsInstalledVersion(scope.installedVersion),
    viewport: entry.retestViewport, outcome: entry.retestOutcome,
    symptom: entry.retestSymptom, reference: entry.retestReference,
    ownerWitnessed: entry.retestWitnessed });
}

export function visual237DecisionKey(entry: Visual237Entry): string {
  return JSON.stringify({ retestKey: entry.retestKey, retestAt: entry.retestAt,
    disposition: entry.disposition, repairArea: entry.repairArea,
    reference: entry.decisionReference, attested: entry.decisionAttested });
}

function validCode(value: string): boolean {
  return value.length >= 4 && safeWindowsFieldReference(value) === value;
}

export function summarizeVisual237(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, draft: Visual237Draft) {
  const source = summarizeAppearance236(theme, scope, sourceDraft);
  const sourceRows = source.rows.filter(row => row.entry.outcome === "finding" || row.entry.outcome === "blocked");
  const sourceRefs = source.rows.flatMap(row => [row.entry.reference, row.entry.followupReference]).filter(Boolean);
  const currentEntries = sourceRows.map(row => draft[row.id] ?? defaultVisual237Entry);
  const retestRefs = [...sourceRefs, ...currentEntries.map(row => row.retestReference).filter(Boolean)];
  const allRefs = [...sourceRefs, ...currentEntries.flatMap(row => [row.retestReference, row.decisionReference]).filter(Boolean)];
  const retestOccurrences = (ref: string) => retestRefs.filter(value => value === ref).length;
  const decisionOccurrences = (ref: string) => allRefs.filter(value => value === ref).length;
  const rows = sourceRows.map(row => {
    const entry = draft[row.id] ?? defaultVisual237Entry;
    const currentKey = visual237RetestKey(theme, scope, row, entry);
    const sourceValid = eligibleSourceGates.has(row.gate);
    const freshRetest = !!entry.retestAt && Number.isFinite(Date.parse(entry.retestAt)) &&
      Date.parse(entry.retestAt) > Date.parse(row.entry.observedAt) && entry.retestKey === currentKey;
    const distinctRetest = validCode(entry.retestReference) && retestOccurrences(entry.retestReference) === 1;
    const distinctDecision = validCode(entry.decisionReference) && decisionOccurrences(entry.decisionReference) === 1;
    const areaMatches = matchingAreas[row.entry.symptom] === entry.repairArea;
    let gate: Visual237Gate;
    if (!sourceValid) gate = "source_stale";
    else if (entry.retestOutcome === "not_tested") gate = "retest_not_tested";
    else if (!entry.retestWitnessed) gate = "witness_gap";
    else if (entry.retestViewport === "unselected") gate = "viewport_gap";
    else if (entry.retestViewport !== row.entry.viewport) gate = "viewport_mismatch";
    else if (!validCode(entry.retestReference)) gate = "evidence_gap";
    else if (!distinctRetest) gate = "duplicate_reference";
    else if (entry.retestOutcome !== "pass" && entry.retestSymptom === "none") gate = "symptom_gap";
    else if (!freshRetest) gate = "retest_stale";
    else if (entry.retestOutcome === "pass") gate = "owner_retest_pass";
    else if (entry.retestOutcome === "blocked") gate = "retest_blocked";
    else if (entry.retestSymptom !== row.entry.symptom) gate = "different_symptom";
    else if (entry.disposition === "pending") gate = "open_finding";
    else if (entry.disposition === "request_ui_review" && !areaMatches) gate = "repair_scope_gap";
    else if (!distinctDecision) gate = "decision_evidence_gap";
    else if (!entry.decisionAttested) gate = "decision_witness_gap";
    else if (!entry.decisionAt || !Number.isFinite(Date.parse(entry.decisionAt)) ||
      Date.parse(entry.decisionAt) <= Date.parse(entry.retestAt) ||
      entry.decisionKey !== visual237DecisionKey(entry)) gate = "decision_stale";
    else gate = entry.disposition === "defer" ? "owner_deferred" :
      entry.disposition === "request_retest" ? "retest_requested" : "review_ready";
    return { ...row, sourceRow: row, sourceEntry: row.entry, sourceValid, entry, gate, currentKey, distinctRetest, distinctDecision };
  });
  return { rows, sourceFindings: sourceRows.length,
    ownerRetestPasses: rows.filter(row => row.gate === "owner_retest_pass").length,
    reviewReady: rows.filter(row => row.gate === "review_ready").length,
    openFindings: sourceRows.length,
    authenticatedOutsideReviews: 0 as const,
    independentWindowsAcceptance: 0 as const,
    repairsAuthorized: 0 as const, repairsExecuted: 0 as const,
    sixAppIntegration: "DISCONNECTED / HOLD" as const, privateRelay: "OFF" as const,
    ql275: "UNDER REVIEW" as const, vault: "SECURITY HOLD" as const,
  };
}

export function formatVisual237Packet(theme: ShellTheme, scope: Appearance236Scope,
  sourceDraft: Appearance236Draft, draft: Visual237Draft) {
  const summary = summarizeVisual237(theme, scope, sourceDraft, draft);
  return [
    "Rosevear AI Hub — Build 237 owner visual finding disposition and retest handoff",
    "OWNER-ENTERED, UNAUTHENTICATED, SESSION-ONLY — NO REPAIR AUTHORIZATION",
    `Theme: ${theme}; installed version (owner entered): ${safeWindowsInstalledVersion(scope.installedVersion) || "MISSING"}`,
    `Build 236 source findings: ${summary.sourceFindings}; owner retest passes: ${summary.ownerRetestPasses}; UI review requests ready: ${summary.reviewReady}; open findings: ${summary.openFindings}`,
    ...summary.rows.map(row => `${row.id} | source gate ${row.sourceValid ? "owner-observed" : "invalid"} | ${row.gate} | original ${row.sourceEntry.reference || "MISSING"} | retest ${row.entry.retestReference || "MISSING"} | tested ${row.entry.retestAt || "MISSING"} | outcome ${row.entry.retestOutcome} | viewport ${row.entry.retestViewport} | symptom ${row.entry.retestSymptom} | disposition ${row.entry.disposition} | UI area ${row.entry.repairArea} | decision ${row.entry.decisionReference || "MISSING"} | decided ${row.entry.decisionAt || "MISSING"}`),
    "Independent Windows acceptance: 0; authenticated external review: 0; repairs authorized: 0; repairs executed: 0.",
    "Six apps DISCONNECTED / HOLD; private relay OFF; QL-275 Under Review; vault SECURITY HOLD; authenticated gateway GETs 0.",
    "No Windows, camera, restore, network, upload or repair actions occurred. Never include secrets, logs, images, addresses, URLs or private device details.",
  ].join("\n");
}
