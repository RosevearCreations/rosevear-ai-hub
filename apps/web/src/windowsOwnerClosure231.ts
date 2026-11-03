/** Build 231 — owner field review packets only; zero automatic or independently verified closures. */
import {
  safeWindowsFieldReference, safeWindowsInstalledVersion,
  type WindowsFieldBasis, type WindowsFieldDraft, type WindowsFieldScope,
} from "./windowsFieldAcceptance228";
import {
  summarizeWindowsTriage, type WindowsTriageDraft,
} from "./windowsFindingTriage229";
import {
  summarizeWindowsRecoveryRetests, windows230SourceKey, type WindowsRetestDraft,
} from "./windowsRecoveryRetest230";

export const WINDOWS_CLOSURE_231_CASES = [
  { id: "theme", label: "Standard theme", first: "Desktop/laptop viewport reference", second: "Tablet/contrast viewport reference", guidance: "Retest actual Home, System, I.T. and Management layouts for clipping, readable contrast and keyboard-accessible status text. Do not infer a visual pass from screenshots in CI." },
  { id: "keyboard", label: "Keyboard accessibility", first: "Keyboard traversal sequence reference", second: "Focus return and dialog recovery reference", guidance: "Check Tab, Shift+Tab, Enter and Escape on the installed Hub with visible focus and a safe return path." },
  { id: "roles", label: "Owner / household roles", first: "Authorized owner-role test reference", second: "Household denial/least-privilege reference", guidance: "Use separately authorized test sessions. Confirm a household user is denied owner audit, restore and secret operations. Never enter or export credentials." },
  { id: "backup", label: "Encrypted backup and isolated restore", first: "Archive integrity and off-machine copy reference", second: "Disposable isolated restore rehearsal reference", guidance: "Verify archive integrity and separately observed restore into disposable storage. Never overwrite live files or claim disaster recovery from inventory alone." },
  { id: "resources", label: "Windows resource budget", first: "Normal CPU/memory/disk and Ollama sample reference", second: "Repeatable load/contention sample reference", guidance: "Record real Windows measurements during representative HA, camera and local AI use. Not measured must never mean normal." },
] as const;
export type WindowsClosure231Id = typeof WINDOWS_CLOSURE_231_CASES[number]["id"];
export type WindowsClosure231Outcome = "not_run" | "pass" | "still_failing" | "blocked";
export type WindowsClosure231Entry = {
  sourceKey: string;
  installedVersion: string;
  outcome: WindowsClosure231Outcome;
  basis: WindowsFieldBasis;
  firstReference: string;
  secondReference: string;
  ownerWitnessed: boolean;
  safetyReviewed: boolean;
  reviewerReference: string;
  recordedAt: string;
  reviewedEvidenceKey: string;
};
export type WindowsClosure231Draft = Partial<Record<WindowsClosure231Id, WindowsClosure231Entry>>;
export type WindowsClosure231Gate =
  "awaiting_229_scope" | "awaiting_230_retest" | "source_changed" | "not_started" |
  "not_run" | "owner_witness_gap" | "evidence_gap" | "freshness_gap" |
  "still_failing" | "blocked" | "owner_packet_ready";

export const windowsClosure231Labels: Record<WindowsClosure231Gate, string> = {
  awaiting_229_scope: "Original finding / Build 229 scoping evidence needed",
  awaiting_230_retest: "Fresh Build 230 backup/resource retest required",
  source_changed: "Original source or follow-up changed — review is stale",
  not_started: "Owner review not started",
  not_run: "On-device check not run",
  owner_witness_gap: "Installed-Windows witness and safety review missing",
  evidence_gap: "Two distinct source-linked evidence references required",
  freshness_gap: "Fresh check time or unchanged evidence snapshot required",
  still_failing: "Still failing — issue remains open",
  blocked: "Blocked — issue remains open",
  owner_packet_ready: "Owner review packet ready — independent closure NOT verified",
};

export const defaultClosure231Entry: WindowsClosure231Entry = {
  sourceKey: "", installedVersion: "", outcome: "not_run", basis: "none",
  firstReference: "", secondReference: "", ownerWitnessed: false,
  safetyReviewed: false, reviewerReference: "", recordedAt: "", reviewedEvidenceKey: "",
};

/** The snapshot prevents editing a prior timed observation into a new pass. */
export function windows231EvidenceKey(entry: WindowsClosure231Entry): string {
  return [safeWindowsInstalledVersion(entry.installedVersion), entry.outcome, entry.basis,
    entry.firstReference, entry.secondReference, String(entry.ownerWitnessed),
    String(entry.safetyReviewed)].join("|");
}

export function windows231SourceKey(
  row: ReturnType<typeof summarizeWindowsTriage>["rows"][number], scope: WindowsFieldScope,
  recovery?: ReturnType<typeof summarizeWindowsRecoveryRetests>["rows"][number],
): string {
  const base = windows230SourceKey(row, scope);
  // Backup and resource review must be invalidated when any Build 230 retest changes.
  return !recovery ? base : JSON.stringify({ base, gate: recovery.gate, retest: recovery.retest });
}

export function summarizeWindowsClosure231(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft,
  retests: WindowsRetestDraft, closure: WindowsClosure231Draft,
) {
  const triage = summarizeWindowsTriage(draft, scope, plans);
  const recovery = summarizeWindowsRecoveryRetests(draft, scope, plans, retests);
  const rows = WINDOWS_CLOSURE_231_CASES.flatMap(test => {
    const row = triage.rows.find(item => item.id === test.id);
    if (!row) return [];
    const prior = recovery.rows.find(item => item.id === test.id);
    const entry = closure[test.id] ?? defaultClosure231Entry;
    const needsRecovery = test.id === "backup" || test.id === "resources";
    const sourceReady = row.gate === "owner_scope_review";
    const recoveryReady = !needsRecovery || prior?.gate === "owner_closure_candidate";
    const sourceKey = windows231SourceKey(row, scope, prior);
    const linked = !!entry.sourceKey && entry.sourceKey === sourceKey;
    const references = [entry.firstReference, entry.secondReference];
    const disallowed = [row.reference, row.plan.reproductionReference,
      prior?.retest.reference ?? "", prior?.retest.changeReference ?? ""].filter(Boolean);
    const evidenceReady = entry.basis !== "none" &&
      safeWindowsInstalledVersion(entry.installedVersion).trim().length >= 3 &&
      references.every(ref => ref.length >= 4 && ref === safeWindowsFieldReference(ref) && !disallowed.includes(ref)) &&
      references[0] !== references[1];
    const recorded = Date.parse(entry.recordedAt);
    const original = Date.parse(row.recordedAt);
    const priorTest = prior ? Date.parse(prior.retest.retestRecordedAt) : original;
    const freshness = Number.isFinite(recorded) && Number.isFinite(original) &&
      recorded > original && Number.isFinite(priorTest) && recorded > priorTest &&
      entry.reviewedEvidenceKey === windows231EvidenceKey(entry);
    let gate: WindowsClosure231Gate;
    if (!sourceReady) gate = "awaiting_229_scope";
    else if (!recoveryReady) gate = "awaiting_230_retest";
    else if (entry.sourceKey && !linked) gate = "source_changed";
    else if (!entry.sourceKey) gate = "not_started";
    else if (entry.outcome === "not_run") gate = "not_run";
    else if (!entry.ownerWitnessed || !entry.safetyReviewed) gate = "owner_witness_gap";
    else if (!evidenceReady) gate = "evidence_gap";
    else if (!freshness) gate = "freshness_gap";
    else if (entry.outcome === "still_failing") gate = "still_failing";
    else if (entry.outcome === "blocked") gate = "blocked";
    else gate = "owner_packet_ready";
    return [{ ...test, original: row, prior, entry, gate, linked }];
  });
  return {
    rows,
    scopedFindings: rows.length,
    ownerPacketsReady: rows.filter(row => row.gate === "owner_packet_ready").length,
    unresolvedRetests: rows.filter(row => row.gate === "still_failing" || row.gate === "blocked").length,
    needsEarlierSource: rows.filter(row => row.gate === "awaiting_229_scope" || row.gate === "awaiting_230_retest").length,
    independentClosures: 0 as const,
    independentVerification: false as const,
    automaticRemediation: false as const,
  };
}

export function formatWindowsClosure231Packet(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft,
  retests: WindowsRetestDraft, closure: WindowsClosure231Draft,
): string {
  const review = summarizeWindowsClosure231(draft, scope, plans, retests, closure);
  return [
    "Rosevear AI Hub — Build 231 owner accessibility, roles, backup and resources review packet",
    "OWNER REPORTED ONLY — NO INDEPENDENT FIELD VERIFICATION, SECURITY APPROVAL OR CONFIRMED ISSUE CLOSURE.",
    `Installed baseline version: ${safeWindowsInstalledVersion(scope.installedVersion) || "NOT RECORDED"}`,
    `Actual owner-reported findings in scope: ${review.scopedFindings}; owner packets ready: ${review.ownerPacketsReady}; independently closed: 0`,
    ...review.rows.map(row => `${row.id} / ${row.label} | original ${row.original.outcome} | Build228 ${row.original.reference || "MISSING"} | Build229 ${row.original.plan.decision}/${row.original.plan.priority} | Build230 ${row.prior?.gate || "NOT_APPLICABLE"} | installed ${safeWindowsInstalledVersion(row.entry.installedVersion) || "MISSING"} | outcome ${row.entry.outcome} | evidence A ${row.entry.firstReference || "MISSING"} | evidence B ${row.entry.secondReference || "MISSING"} | time ${row.entry.recordedAt || "MISSING"} | reviewer ${row.entry.reviewerReference || "NOT_REFERENCED"} (unverified) | gate ${row.gate}`),
    ...(review.rows.length ? [] : ["NO AUTHENTIC BUILD 228/229 OWNER FINDINGS ENTERED — NOTHING INDEPENDENTLY CLOSED."]),
    "All successful owner reports remain packets for separate independent review, not a clearance for live access, restore or vault operation.",
    "Six-app integration DISCONNECTED / HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "No credentials, account names, addresses, private IPs, camera data, full logs, measured resource values or sensitive backup contents are included.",
  ].join("\n");
}
