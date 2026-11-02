/** Build 230 — supervised, local-only installed-Windows retest packets, never automatic closure. */
import {
  safeWindowsFieldReference, safeWindowsInstalledVersion, type WindowsFieldBasis,
  type WindowsFieldCaseId, type WindowsFieldDraft, type WindowsFieldScope,
} from "./windowsFieldAcceptance228";
import {
  defaultTriageEntry, formatWindowsFindingPlan229, summarizeWindowsTriage, windowsFindingSourceKey,
  type WindowsTriageDecision, type WindowsTriageDraft, type WindowsTriageEntry,
  type WindowsTriagePriority, type WindowsTriageReproduction,
} from "./windowsFindingTriage229";

export const WINDOWS_RETEST_230_CASES = ["startup", "release", "ha", "camera", "mqtt", "backup", "rollback", "resources"] as const;
export type WindowsRetestCaseId = typeof WINDOWS_RETEST_230_CASES[number];
export type WindowsRetestOutcome = "not_run" | "pass" | "still_failing" | "blocked";
export type WindowsRetestRecord = {
  sourceKey: string;
  ownerChangeAttested: boolean;
  changeReference: string;
  changeRecordedAt: string;
  safetyReviewed: boolean;
  installedVersion: string;
  outcome: WindowsRetestOutcome;
  basis: WindowsFieldBasis;
  reference: string;
  retestWitnessed: boolean;
  retestRecordedAt: string;
  testedChangeKey: string;
};
export type WindowsRetestDraft = Partial<Record<WindowsRetestCaseId, WindowsRetestRecord>>;
export type WindowsRetestGate =
  "awaiting_229_scope" | "source_changed" | "not_started" | "change_evidence_gap" |
  "safety_review_gap" | "retest_not_run" | "fresh_retest_gap" |
  "owner_closure_candidate" | "still_failing" | "retest_blocked";

export const windowsRetestGateLabels: Record<WindowsRetestGate, string> = {
  awaiting_229_scope: "Build 229 scoping evidence needed",
  source_changed: "Original source or plan changed — retest is stale",
  not_started: "Retest not started",
  change_evidence_gap: "Owner-observed change evidence missing",
  safety_review_gap: "Safe-stop or provider boundary review missing",
  retest_not_run: "Fresh installed-Windows retest not run",
  fresh_retest_gap: "New, distinct on-device retest evidence required",
  owner_closure_candidate: "Owner-reported closure candidate — independent review still required",
  still_failing: "Retest still failing — issue remains open",
  retest_blocked: "Retest blocked — issue remains open",
};

export const defaultWindowsRetest: WindowsRetestRecord = {
  sourceKey: "", ownerChangeAttested: false, changeReference: "", changeRecordedAt: "",
  safetyReviewed: false, installedVersion: "", outcome: "not_run", basis: "none",
  reference: "", retestWitnessed: false, retestRecordedAt: "", testedChangeKey: "",
};

export function windows230SourceKey(
  row: Parameters<typeof windowsFindingSourceKey>[0] & { plan: WindowsTriageEntry }, scope: WindowsFieldScope,
): string {
  return [windowsFindingSourceKey(row, scope), row.plan.sourceKey, row.plan.priority, row.plan.decision,
    row.plan.reproduction, row.plan.reproductionReference].join("|");
}

export function windows230ChangeKey(entry: WindowsRetestRecord): string {
  return [entry.changeReference, entry.changeRecordedAt, String(entry.ownerChangeAttested),
    safeWindowsInstalledVersion(entry.installedVersion), String(entry.retestWitnessed)].join("|");
}

/** Only real owner-reported Build 228 failures with a Build 229 repair proposal appear. */
export function summarizeWindowsRecoveryRetests(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft, retests: WindowsRetestDraft,
) {
  const triage = summarizeWindowsTriage(draft, scope, plans);
  const rows = triage.rows.filter(row => (WINDOWS_RETEST_230_CASES as readonly string[]).includes(row.id))
    .map(row => {
      const id = row.id as WindowsRetestCaseId;
      const retest = retests[id] ?? defaultWindowsRetest;
      const ownerScopeReady = row.gate === "owner_scope_review";
      const sourceMatched = !!retest.sourceKey && retest.sourceKey === windows230SourceKey(row, scope);
      const changeReady = retest.ownerChangeAttested && !!retest.changeRecordedAt &&
        safeWindowsFieldReference(retest.changeReference).length >= 4 &&
        safeWindowsFieldReference(retest.changeReference) !== row.reference &&
        safeWindowsFieldReference(retest.changeReference) !== row.plan.reproductionReference;
      const time = Date.parse(retest.retestRecordedAt);
      const changeTime = Date.parse(retest.changeRecordedAt);
      const sourceTime = Date.parse(row.recordedAt);
      const freshEvidence = retest.basis !== "none" && retest.reference.length >= 4 &&
        safeWindowsFieldReference(retest.reference) === retest.reference &&
        ![row.reference, row.plan.reproductionReference, retest.changeReference].includes(retest.reference) &&
        retest.retestWitnessed && safeWindowsInstalledVersion(retest.installedVersion).trim().length >= 3 &&
        Number.isFinite(time) && Number.isFinite(changeTime) && Number.isFinite(sourceTime) &&
        time >= changeTime && changeTime >= sourceTime && time > sourceTime &&
        retest.testedChangeKey === windows230ChangeKey(retest);
      let gate: WindowsRetestGate;
      if (!ownerScopeReady) gate = "awaiting_229_scope";
      else if (retest.sourceKey && !sourceMatched) gate = "source_changed";
      else if (!retest.sourceKey) gate = "not_started";
      else if (!changeReady) gate = "change_evidence_gap";
      else if (!retest.safetyReviewed) gate = "safety_review_gap";
      else if (retest.outcome === "not_run") gate = "retest_not_run";
      else if (!freshEvidence) gate = "fresh_retest_gap";
      else if (retest.outcome === "still_failing") gate = "still_failing";
      else if (retest.outcome === "blocked") gate = "retest_blocked";
      else gate = "owner_closure_candidate";
      return { ...row, id, retest, gate, sourceMatched, changeReady, freshEvidence };
    });
  return {
    rows, inScope: rows.length,
    scopingReady: rows.filter(row => row.gate !== "awaiting_229_scope").length,
    ownerClosureCandidates: rows.filter(row => row.gate === "owner_closure_candidate").length,
    failuresRemainOpen: rows.filter(row => row.gate === "still_failing" || row.gate === "retest_blocked").length,
    handedToBuild231: triage.rows.filter(row => !(WINDOWS_RETEST_230_CASES as readonly string[]).includes(row.id)).length,
    independentlyVerified: false as const,
    issuesClosed: 0 as const,
    repairsExecuted: false as const,
  };
}

/** Strict private import of a canonical 229 plan into an already matching Build 228 owner session. */
export function parseWindowsTriageHandoff229(input: string, draft: WindowsFieldDraft, scope: WindowsFieldScope):
  | { ok: true; plans: WindowsTriageDraft }
  | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });
  if (input.length < 200 || input.length > 24000) return fail("Invalid plan length. Copy the complete redacted Build 229 handoff.");
  const lines = input.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines[0] !== "Rosevear AI Hub — Build 229 owner finding triage and source-matched repair proposal" ||
      !lines.includes("OWNER REPORTED / PROPOSED ONLY — NO REPAIRS APPROVED, INSTALLED WINDOWS RESULTS VERIFIED OR ACTIONS RUN.")) {
    return fail("Unrecognized Build 229 owner-only plan.");
  }
  const rows = summarizeWindowsTriage(draft, scope, {}).rows;
  const plans: WindowsTriageDraft = {};
  const priorities = ["unassigned", "p0", "p1", "p2", "p3"];
  const reproductions = ["not_attempted", "reproduced", "intermittent", "not_reproduced"];
  const decisions = ["unreviewed", "investigate", "repair_proposal", "retest_only", "defer"];
  for (const row of rows) {
    const prefix = `${row.id} / ${row.title} | `;
    const matches = lines.filter(line => line.startsWith(prefix));
    if (matches.length !== 1) return fail(`Missing or duplicate Build 229 case ${row.id}.`);
    const segments = matches[0].split(" | ");
    if (segments.length !== 10 || segments[1] !== `Build228 ${row.outcome}` ||
      segments[2] !== `source ${row.reference || "MISSING"}` ||
      segments[3] !== `source time ${row.recordedAt || "MISSING"}` ||
      segments[9] !== `proposed action: ${row.action}`) {
      return fail(`Plan source mismatch for ${row.id}. Load the matching Build 228 handoff first.`);
    }
    const priority = segments[4].replace(/^priority /, "");
    const reproduction = segments[5].replace(/^reproduction /, "");
    const ref = segments[6].replace(/^retest /, "");
    const decision = segments[7].replace(/^decision /, "");
    if (!priorities.includes(priority) || !reproductions.includes(reproduction) ||
        !decisions.includes(decision) || (ref !== "MISSING" && (ref.length > 80 || ref !== safeWindowsFieldReference(ref)))) {
      return fail(`Invalid owner plan fields for ${row.id}.`);
    }
    const hasPlan = priority !== "unassigned" || reproduction !== "not_attempted" ||
      ref !== "MISSING" || decision !== "unreviewed";
    const plan: WindowsTriageEntry = {
      ...defaultTriageEntry,
      priority: priority as WindowsTriagePriority, reproduction: reproduction as WindowsTriageReproduction,
      reproductionReference: ref === "MISSING" ? "" : ref,
      decision: decision as WindowsTriageDecision,
      sourceKey: hasPlan && row.evidenceReady ? windowsFindingSourceKey(row, scope) : "",
    };
    plans[row.id] = plan;
  }
  // Prevent edited summaries, forged status transitions, mismatched versions and extra rows.
  if (formatWindowsFindingPlan229(draft, scope, plans) !== lines.join("\n")) {
    return fail("The Build 229 plan does not match the current Build 228 evidence and computed safety gates.");
  }
  return { ok: true, plans };
}

export function formatWindowsRecoveryPacket230(
  draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft, retests: WindowsRetestDraft,
): string {
  const summary = summarizeWindowsRecoveryRetests(draft, scope, plans, retests);
  return [
    "Rosevear AI Hub — Build 230 installed recovery and device/camera retest owner packet",
    "OWNER REPORTED ONLY — NOT AN INDEPENDENT WINDOWS ACCEPTANCE OR A VERIFIED CLOSURE.",
    `Installed baseline version: ${safeWindowsInstalledVersion(scope.installedVersion) || "NOT RECORDED"}`,
    `In scope: ${summary.inScope}; owner closure candidates: ${summary.ownerClosureCandidates}; unresolved retests: ${summary.failuresRemainOpen}; independently closed: 0`,
    ...summary.rows.map(row => `${row.id} / ${row.title} | baseline ${row.outcome} | source ${row.reference || "MISSING"} | plan ${row.plan.priority}/${row.plan.decision} | change ${row.retest.changeReference || "MISSING"} | change time ${row.retest.changeRecordedAt || "MISSING"} | retest version ${safeWindowsInstalledVersion(row.retest.installedVersion) || "MISSING"} | outcome ${row.retest.outcome} | retest source ${row.retest.reference || "MISSING"} | retest time ${row.retest.retestRecordedAt || "MISSING"} | gate ${row.gate} | follow-up ${row.action}`),
    ...(summary.rows.length ? [] : ["NO AUTHENTIC BUILD 228/229 RECOVERY OR DEVICE/CAMERA FINDINGS — NO CLOSURE REQUESTED."]),
    `Deferred to Build 231 review (theme, keyboard, roles): ${summary.handedToBuild231}`,
    "No hardware action, service restart, camera stream, MQTT publish or restore was run by this screen.",
    "All apparent passes remain OWNER-REPORTED CANDIDATES. Independent review and a separately authorized repair/release decision are still required.",
    "Six-app integration DISCONNECTED / HOLD; relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "Do not include secrets, local IPs, full logs, addresses, camera images or personal data in this packet.",
  ].join("\n");
}
