/** Build 234: source-matched owner proposals. This module cannot authenticate proof or authorize an actual repair. */
import { safeWindowsFieldReference, type WindowsFieldScope } from "./windowsFieldAcceptance228";
import { type ShellTheme } from "./CommandShell";
import { summarizeDarkOwner233, type Dark233CheckId, type Dark233Draft } from "./windowsDarkOwner233";

export type Dark234Priority = "unassigned" | "p1" | "p2" | "p3";
export type Dark234Reproduction = "none" | "direct_windows" | "supervised_windows";
export type Dark234Action = "not_scoped" | "css_contrast" | "keyboard_focus" | "responsive_layout" | "defer";
export type Dark234Impact = "unreviewed" | "presentation_only" | "requires_security_review";
export type Dark234Decision = "pending" | "request_retest" | "defer" | "request_conditional_review";
export type Dark234Entry = {
  sourceKey: string;
  priority: Dark234Priority;
  reproduction: Dark234Reproduction;
  reproductionReference: string;
  proposedAction: Dark234Action;
  impact: Dark234Impact;
  rollbackReference: string;
  independentReference: string;
  reviewerAttested: boolean;
  ownerDecision: Dark234Decision;
  ownerDecisionReference: string;
  ownerReviewAttested: boolean;
  recordedAt: string;
  reviewedKey: string;
};
export type Dark234Draft = Partial<Record<Dark233CheckId, Dark234Entry>>;
export const defaultDark234Entry: Dark234Entry = {
  sourceKey: "", priority: "unassigned", reproduction: "none", reproductionReference: "",
  proposedAction: "not_scoped", impact: "unreviewed", rollbackReference: "",
  independentReference: "", reviewerAttested: false, ownerDecision: "pending",
  ownerDecisionReference: "", ownerReviewAttested: false, recordedAt: "", reviewedKey: "",
};
export type Dark234Gate = "source_changed" | "not_started" | "priority_missing" |
  "reproduction_gap" | "scope_missing" | "safety_gap" | "owner_decision_missing" |
  "distinct_reference_gap" | "independent_reference_gap" | "owner_review_consent_missing" |
  "fresh_owner_record_missing" | "risk_review_required" | "retest_requested" | "owner_deferred" |
  "conditional_review_ready";
export const dark234GateLabels: Record<Dark234Gate, string> = {
  source_changed: "Build 233 finding changed — previous repair proposal stale",
  not_started: "No Build 234 owner triage has started",
  priority_missing: "Set a priority from actual observed impact",
  reproduction_gap: "Fresh installed-Windows reproduction reference required",
  scope_missing: "Choose a specific proposed UI change",
  safety_gap: "Impact boundary and rollback plan reference required",
  owner_decision_missing: "Separate owner decision required",
  distinct_reference_gap: "New owner decision reference must differ from prior evidence",
  independent_reference_gap: "Separate reviewer evidence reference and owner attestation required",
  owner_review_consent_missing: "Explicit permission for conditional *review request* required",
  fresh_owner_record_missing: "Fresh owner decision timestamp and unchanged source snapshot required",
  risk_review_required: "Security/privilege impact cannot enter visual-only conditional review",
  retest_requested: "Owner requested further Windows retest — finding remains open",
  owner_deferred: "Owner deferred — finding remains open",
  conditional_review_ready: "Conditional authorization REVIEW PACKET ready — repair not authorized",
};

export function dark234SourceKey(row: ReturnType<typeof summarizeDarkOwner233>["rows"][number],
  theme: ShellTheme, scope: WindowsFieldScope): string {
  return JSON.stringify({ id: row.id, theme, installedVersion: scope.installedVersion,
    physicallyWitnessed: scope.physicallyWitnessed, outcome: row.gate, field: row.entry });
}

export function dark234DecisionKey(entry: Dark234Entry): string {
  return JSON.stringify({ sourceKey: entry.sourceKey, priority: entry.priority,
    reproduction: entry.reproduction, reproductionReference: entry.reproductionReference,
    proposedAction: entry.proposedAction, impact: entry.impact, rollbackReference: entry.rollbackReference,
    independentReference: entry.independentReference, reviewerAttested: entry.reviewerAttested,
    ownerDecision: entry.ownerDecision, ownerDecisionReference: entry.ownerDecisionReference,
    ownerReviewAttested: entry.ownerReviewAttested });
}

export function summarizeDarkFinding234(theme: ShellTheme, scope: WindowsFieldScope, visual: Dark233Draft,
  draft: Dark234Draft) {
  const baseline = summarizeDarkOwner233(theme, scope, visual);
  const candidates = baseline.rows.filter(row => row.gate === "open_finding" || row.gate === "open_blocked");
  const rows = candidates.map(source => {
    const entry = draft[source.id] ?? defaultDark234Entry;
    const sourceKey = dark234SourceKey(source, theme, scope);
    const distinct = (code: string) => code.length >= 4 && code === safeWindowsFieldReference(code) &&
      code !== source.entry.reference;
    const refs = [entry.reproductionReference, entry.rollbackReference, entry.independentReference,
      entry.ownerDecisionReference].filter(Boolean);
    const independentlyDistinct = refs.length === new Set(refs).size;
    let gate: Dark234Gate;
    if (entry.sourceKey && entry.sourceKey !== sourceKey) gate = "source_changed";
    else if (!entry.sourceKey) gate = "not_started";
    else if (entry.priority === "unassigned") gate = "priority_missing";
    else if (entry.ownerDecision === "request_conditional_review" &&
      (entry.reproduction === "none" || !distinct(entry.reproductionReference))) gate = "reproduction_gap";
    else if (entry.ownerDecision === "request_conditional_review" && entry.proposedAction === "not_scoped") gate = "scope_missing";
    else if (entry.ownerDecision === "request_conditional_review" &&
      (entry.impact === "unreviewed" || !distinct(entry.rollbackReference))) gate = "safety_gap";
    else if (entry.ownerDecision === "pending") gate = "owner_decision_missing";
    else if (!distinct(entry.ownerDecisionReference) || !independentlyDistinct) gate = "distinct_reference_gap";
    else if (entry.ownerDecision === "request_conditional_review" &&
      (!distinct(entry.independentReference) || !entry.reviewerAttested)) gate = "independent_reference_gap";
    else if (!entry.ownerReviewAttested) gate = "owner_review_consent_missing";
    else if (entry.ownerDecision === "request_conditional_review" &&
      (entry.impact !== "presentation_only" || entry.proposedAction === "defer")) gate = "risk_review_required";
    else if (!entry.recordedAt || !Number.isFinite(Date.parse(entry.recordedAt)) ||
      Date.parse(entry.recordedAt) <= Date.parse(source.entry.observedAt) ||
      entry.reviewedKey !== dark234DecisionKey(entry)) gate = "fresh_owner_record_missing";
    else gate = entry.ownerDecision === "request_retest" ? "retest_requested" :
      entry.ownerDecision === "defer" ? "owner_deferred" : "conditional_review_ready";
    return { ...source, entry, sourceKey, gate, findingReference: source.entry.reference,
      observedAt: source.entry.observedAt, findingGate: source.gate };
  });
  const visible = new Set(rows.map(row => row.id));
  const staleDrafts = Object.keys(draft).filter(key => !visible.has(key as Dark233CheckId)).length;
  return {
    rows, ownerFindings: rows.length, staleDrafts,
    conditionalReviewPackets: rows.filter(row => row.gate === "conditional_review_ready").length,
    retestRequests: rows.filter(row => row.gate === "retest_requested").length,
    independentlyVerified: false as const, repairsAuthorized: 0 as const, repairsExecuted: 0 as const,
    privateRelay: "OFF" as const, sixAppIntegration: "DISCONNECTED / HOLD" as const,
    ql275: "UNDER REVIEW" as const, vault: "SECURITY HOLD" as const,
  };
}

export function formatDarkFinding234Packet(theme: ShellTheme, scope: WindowsFieldScope,
  visual: Dark233Draft, draft: Dark234Draft): string {
  const result = summarizeDarkFinding234(theme, scope, visual, draft);
  return [
    "Rosevear AI Hub — Build 234 Dark Mode finding triage and conditional repair authorization review",
    "OWNER-ENTERED METADATA ONLY. No external identity independently authenticated, no repair authorized or executed.",
    `Owner-reported visual findings ${result.ownerFindings}; stale drafts ${result.staleDrafts}; conditional REVIEW packets ${result.conditionalReviewPackets}; actual repair grants 0`,
    ...result.rows.map(row => `${row.id} | Build233 ${row.findingReference} | original observation ${row.observedAt} | ` +
      `priority ${row.entry.priority} | reproduction ${row.entry.reproductionReference || "MISSING"} | ` +
      `proposed UI action ${row.entry.proposedAction} | impact ${row.entry.impact} | rollback ${row.entry.rollbackReference || "MISSING"} | ` +
      `independent reviewer ref ${row.entry.independentReference || "MISSING"} (NOT AUTHENTICATED) | ` +
      `decision ${row.entry.ownerDecision} | owner ref ${row.entry.ownerDecisionReference || "MISSING"} | ` +
      `time ${row.entry.recordedAt || "MISSING"} | gate ${row.gate}`),
    ...(result.ownerFindings ? [] : ["NO AUTHENTIC BUILD 233 OWNER FINDINGS IN THIS SESSION — ZERO REPAIR CANDIDATES."]),
    "A conditional review packet is a request to evaluate a separately proposed UI repair, NOT permission to apply it. Actual scope and execution require further independent proof and owner authorization.",
    "No live Windows, camera, MQTT, X10, backup, vault, role, relay or integration action was run.",
    "Six-app DISCONNECTED / HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "Use safe reference codes only; do not enter passwords, IPs, camera images, full logs or sensitive backup contents.",
  ].join("\n");
}
