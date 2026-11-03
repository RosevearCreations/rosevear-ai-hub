/** Build 233: local owner notes, never a Windows probe or independent closure certificate. */
import { safeWindowsFieldReference, safeWindowsInstalledVersion, type WindowsFieldScope } from "./windowsFieldAcceptance228";
import { type ShellTheme } from "./CommandShell";
import { type WindowsIndependent232Draft, summarizeWindowsIndependent232, windows232SourceKey } from "./windowsIndependentClosure232";
import { type WindowsFieldDraft } from "./windowsFieldAcceptance228";
import { type WindowsTriageDraft } from "./windowsFindingTriage229";
import { type WindowsRetestDraft } from "./windowsRecoveryRetest230";
import { type WindowsClosure231Draft, type WindowsClosure231Id } from "./windowsOwnerClosure231";

export const darkOwner233Checks = [
  { id: "surfaces", title: "Low-glare panels and screen backgrounds", instructions: "On the installed Windows Hub, inspect Home, System and Devices. Identify any solid-white panels, unintended bright overlays or unreadable text." },
  { id: "status", title: "Status, warning and held labels", instructions: "Check contrast for GREEN/HELD/OFF states in System, Cameras and the six-app readiness screen. Never infer device readiness from badge colour." },
  { id: "forms", title: "Forms, dialogs, search and tables", instructions: "Inspect an owner-safe form, Global Search, table headings, select menus and error states; confirm labels and values remain readable." },
  { id: "keyboard", title: "Keyboard focus, zoom and theme switching", instructions: "Use Tab, Shift+Tab, Enter and Escape. Inspect visible focus, 200% zoom and Dark/Standard/High contrast switching without losing context." },
  { id: "responsive", title: "Windows tablet and narrow layout", instructions: "Repeat with the permitted Windows viewport/tablet. Check sidebar, responsive cards, contrast, clipping and touch target accessibility." },
] as const;
export type Dark233CheckId = typeof darkOwner233Checks[number]["id"];
export type Dark233Outcome = "not_tested" | "pass" | "finding" | "blocked";
export type Dark233Basis = "none" | "direct_windows" | "supervised_windows";
export type Dark233Observation = {
  outcome: Dark233Outcome; basis: Dark233Basis; reference: string; installedVersion: string;
  ownerWitnessed: boolean; observedAt: string; checkedSnapshot: string;
};
export type Dark233Draft = Partial<Record<Dark233CheckId, Dark233Observation>>;
export const defaultDark233Observation: Dark233Observation = {
  outcome: "not_tested", basis: "none", reference: "", installedVersion: "",
  ownerWitnessed: false, observedAt: "", checkedSnapshot: "",
};
export type Dark233Gate = "not_tested" | "dark_mode_inactive" | "installed_scope_gap" |
  "evidence_gap" | "source_changed" | "owner_record_needed" | "owner_pass" | "open_finding" | "open_blocked";
export const dark233GateLabels: Record<Dark233Gate, string> = {
  not_tested: "Not tested on installed Windows",
  dark_mode_inactive: "Switch to Dark Mode before checking this result",
  installed_scope_gap: "Installed Windows version and owner witness required",
  evidence_gap: "Direct Windows evidence, safe reference and owner confirmation required",
  source_changed: "Theme or installed source changed — record a new observation",
  owner_record_needed: "Record a fresh owner observation before accepting the result",
  owner_pass: "Owner-reported visual pass only — not independently accepted",
  open_finding: "Owner finding — proposed repair needs separate authorization",
  open_blocked: "Blocked owner check — keep open",
};

export function dark233Snapshot(id: Dark233CheckId, theme: ShellTheme, scope: WindowsFieldScope, entry: Dark233Observation): string {
  return JSON.stringify({ id, theme, installed: scope.installedVersion, physicallyWitnessed: scope.physicallyWitnessed,
    outcome: entry.outcome, basis: entry.basis, reference: entry.reference,
    installedVersion: entry.installedVersion, ownerWitnessed: entry.ownerWitnessed });
}

export function summarizeDarkOwner233(theme: ShellTheme, scope: WindowsFieldScope, draft: Dark233Draft) {
  const usedReferences = Object.values(draft).map(item => item?.reference).filter(Boolean);
  const rows = darkOwner233Checks.map(check => {
    const entry = draft[check.id] ?? defaultDark233Observation;
    const scopeReady = scope.physicallyWitnessed && safeWindowsInstalledVersion(scope.installedVersion).trim().length >= 3;
    const evidenceReady = entry.ownerWitnessed && entry.basis !== "none" &&
      entry.reference.length >= 4 && entry.reference === safeWindowsFieldReference(entry.reference) &&
      usedReferences.filter(reference => reference === entry.reference).length === 1 &&
      entry.installedVersion === scope.installedVersion && scopeReady;
    let gate: Dark233Gate;
    if (theme !== "dark") gate = "dark_mode_inactive";
    else if (entry.outcome === "not_tested") gate = "not_tested";
    else if (!scopeReady) gate = "installed_scope_gap";
    else if (!evidenceReady) gate = "evidence_gap";
    else if (entry.checkedSnapshot && entry.checkedSnapshot !== dark233Snapshot(check.id, theme, scope, entry)) gate = "source_changed";
    else if (!entry.observedAt || !Number.isFinite(Date.parse(entry.observedAt)) || !entry.checkedSnapshot) gate = "owner_record_needed";
    else gate = entry.outcome === "pass" ? "owner_pass" : entry.outcome === "finding" ? "open_finding" : "open_blocked";
    return { ...check, entry, gate };
  });
  return { rows, ownerPasses: rows.filter(row => row.gate === "owner_pass").length,
    openFindings: rows.filter(row => row.gate === "open_finding" || row.gate === "open_blocked").length,
    completeOwnerReview: rows.every(row => row.gate === "owner_pass"),
    verifiedWindowsAcceptance: false as const, repairsAuthorized: false as const };
}

export type Closure233Disposition = "pending" | "request_source_proof" | "request_retest" | "defer" | "request_external_validation";
export type Closure233Followup = { sourceKey: string; disposition: Closure233Disposition;
  reference: string; ownerAuthorizedFollowup: boolean; recordedAt: string; reviewedKey: string };
export type Closure233Draft = Partial<Record<WindowsClosure231Id, Closure233Followup>>;
export const defaultClosure233Followup: Closure233Followup = {
  sourceKey: "", disposition: "pending", reference: "", ownerAuthorizedFollowup: false,
  recordedAt: "", reviewedKey: "",
};
export type Closure233Gate = "source_not_ready" | "source_changed" | "not_started" | "owner_followup_needed" |
  "invalid_reference" | "owner_permission_needed" | "observation_stale" | "validation_not_eligible" |
  "source_proof_requested" | "retest_requested" | "owner_deferred" | "external_validation_requested";
export const closure233GateLabels: Record<Closure233Gate, string> = {
  source_not_ready: "Build 231 owner evidence still incomplete — no closure",
  source_changed: "Build 232 source revision changed — follow-up is stale",
  not_started: "No separate Build 233 owner follow-up recorded",
  owner_followup_needed: "Select a specific follow-up for this exception",
  invalid_reference: "New and distinct owner follow-up reference required",
  owner_permission_needed: "Explicit owner follow-up authorization required",
  observation_stale: "Fresh follow-up timestamp or source match required",
  validation_not_eligible: "Independent validation request requires the prior Build 232 closure-review request",
  source_proof_requested: "Owner requested additional authentic source proof — remains open",
  retest_requested: "Owner requested a Windows retest — remains open",
  owner_deferred: "Owner deferred the exception — remains open",
  external_validation_requested: "External validation requested — no independent closure authenticated",
};

export function closure233SourceKey(row: ReturnType<typeof summarizeWindowsIndependent232>["rows"][number]): string {
  return JSON.stringify({ id: row.id, source: windows232SourceKey(row.source), review: row.entry, gate: row.gate });
}
export function closure233DecisionKey(entry: Closure233Followup): string {
  return JSON.stringify({ source: entry.sourceKey, disposition: entry.disposition, reference: entry.reference,
    ownerAuthorizedFollowup: entry.ownerAuthorizedFollowup });
}
export function summarizeClosureExceptions233(field: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft,
  retests: WindowsRetestDraft, closure231: WindowsClosure231Draft, independent232: WindowsIndependent232Draft,
  followups: Closure233Draft) {
  const upstream = summarizeWindowsIndependent232(field, scope, plans, retests, closure231, independent232);
  const rows = upstream.rows.map(row => {
    const entry = followups[row.id] ?? defaultClosure233Followup;
    const sourceKey = closure233SourceKey(row);
    const existingRefs = [row.original.reference, row.original.plan.reproductionReference,
      row.prior?.retest.reference, row.prior?.retest.changeReference,
      row.source.entry.firstReference, row.source.entry.secondReference, row.source.entry.reviewerReference,
      row.entry.reviewerCode, row.entry.reviewerReference, row.entry.ownerDecisionReference].filter(Boolean);
    let gate: Closure233Gate;
    if (row.source.gate !== "owner_packet_ready") gate = "source_not_ready";
    else if (entry.sourceKey && entry.sourceKey !== sourceKey) gate = "source_changed";
    else if (!entry.sourceKey) gate = "not_started";
    else if (entry.disposition === "pending") gate = "owner_followup_needed";
    else if (entry.reference.length < 4 || safeWindowsFieldReference(entry.reference) !== entry.reference || existingRefs.includes(entry.reference)) gate = "invalid_reference";
    else if (!entry.ownerAuthorizedFollowup) gate = "owner_permission_needed";
    else if (!entry.recordedAt || !Number.isFinite(Date.parse(entry.recordedAt)) ||
      Date.parse(entry.recordedAt) <= Date.parse(row.entry.ownerRecordedAt || row.entry.reviewerRecordedAt || row.source.entry.recordedAt) ||
      entry.reviewedKey !== closure233DecisionKey(entry)) gate = "observation_stale";
    else if (entry.disposition === "request_external_validation" && row.gate !== "owner_closure_review_request") gate = "validation_not_eligible";
    else gate = entry.disposition === "request_source_proof" ? "source_proof_requested" :
      entry.disposition === "request_retest" ? "retest_requested" :
        entry.disposition === "defer" ? "owner_deferred" : "external_validation_requested";
    return { ...row, independent: row.entry, upstreamGate: row.gate, entry, gate, sourceKey };
  });
  return { rows, openExceptions: rows.length,
    recordedFollowups: rows.filter(row => ["source_proof_requested", "retest_requested", "owner_deferred", "external_validation_requested"].includes(row.gate)).length,
    verifiedClosures: 0 as const, independentlyAuthenticated: false as const,
    repairsAuthorized: false as const, sixAppIntegration: "DISCONNECTED / HOLD" as const,
    privateRelay: "OFF" as const, vault: "SECURITY HOLD" as const };
}

export function formatDarkOwnerPacket233(theme: ShellTheme, scope: WindowsFieldScope, visual: Dark233Draft,
  field: WindowsFieldDraft, plans: WindowsTriageDraft, retests: WindowsRetestDraft,
  closure231: WindowsClosure231Draft, independent232: WindowsIndependent232Draft, followups: Closure233Draft) {
  const checks = summarizeDarkOwner233(theme, scope, visual);
  const exceptions = summarizeClosureExceptions233(field, scope, plans, retests, closure231, independent232, followups);
  return [
    "Rosevear AI Hub — Build 233 private Dark Mode owner acceptance and closure exception follow-up",
    "OWNER-REPORTED ONLY. No independent reviewer authenticated; no issue independently closed; no repair authorized.",
    `Theme ${theme}; installed version ${safeWindowsInstalledVersion(scope.installedVersion) || "NOT RECORDED"}; Windows witnessed ${scope.physicallyWitnessed ? "owner-reported" : "NO"}`,
    `Visual owner passes ${checks.ownerPasses}/${checks.rows.length}; open visual findings ${checks.openFindings}; verified Windows acceptance NO`,
    ...checks.rows.map(row => `${row.id} | ${row.gate} | ref ${row.entry.reference || "MISSING"} | observed ${row.entry.observedAt || "MISSING"}`),
    `Original source-linked exceptions ${exceptions.openExceptions}; owner follow-ups ${exceptions.recordedFollowups}; verified closures 0`,
    ...exceptions.rows.map(row => `${row.id} | upstream ${row.source.gate}/${row.gate} | owner ${row.entry.disposition} | ref ${row.entry.reference || "MISSING"} | recorded ${row.entry.recordedAt || "MISSING"}`),
    "The app did not validate external evidence or perform a Windows, camera, role, backup, repair or network action.",
    "Six-app integration DISCONNECTED / HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "Keep actual logs, photos, personal details, credentials and protected device evidence in approved local custody, not this form.",
  ].join("\n");
}
