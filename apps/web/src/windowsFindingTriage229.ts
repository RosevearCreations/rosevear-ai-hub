/** Build 229: local-only, owner-reported triage. Never turns a source record into a verified device result. */
import {
  WINDOWS_FIELD_SCHEMA, normalizeWindowsObservation, safeWindowsFieldReference,
  safeWindowsInstalledVersion, summarizeWindowsFieldReview, windowsFieldCases,
  type WindowsFieldCaseId, type WindowsFieldDraft, type WindowsFieldOutcome, type WindowsFieldScope,
} from "./windowsFieldAcceptance228";

export type WindowsTriagePriority = "unassigned" | "p0" | "p1" | "p2" | "p3";
export type WindowsTriageReproduction = "not_attempted" | "reproduced" | "intermittent" | "not_reproduced";
export type WindowsTriageDecision = "unreviewed" | "investigate" | "repair_proposal" | "retest_only" | "defer";
export type WindowsTriageEntry = {
  priority: WindowsTriagePriority;
  reproduction: WindowsTriageReproduction;
  reproductionReference: string;
  decision: WindowsTriageDecision;
  sourceKey: string;
};
export type WindowsTriageDraft = Partial<Record<WindowsFieldCaseId, WindowsTriageEntry>>;
export type WindowsTriageGate =
  "source_gap" | "source_changed" | "untriaged" | "priority_needed" |
  "reproduction_gap" | "owner_scope_review" | "investigation_review" | "retest_only" | "on_hold";

export const defaultTriageEntry: WindowsTriageEntry = {
  priority: "unassigned", reproduction: "not_attempted", reproductionReference: "",
  decision: "unreviewed", sourceKey: "",
};

export const windowsTriageGateLabels: Record<WindowsTriageGate, string> = {
  source_gap: "Build 228 evidence missing",
  source_changed: "Build 228 source changed — re-review",
  untriaged: "Owner triage not started",
  priority_needed: "Owner priority needed",
  reproduction_gap: "Reproduction evidence needed",
  owner_scope_review: "Repair candidate — owner scoping decision required",
  investigation_review: "Investigation candidate — owner scoping decision required",
  retest_only: "Retest requested — not closed",
  on_hold: "Deferred — remains open",
};

/** The key binds a plan to the exact owner-reported observation, not to GitHub CI or a device. */
export function windowsFindingSourceKey(
  row: ReturnType<typeof summarizeWindowsFieldReview>["rows"][number], scope: WindowsFieldScope,
): string {
  return [row.id, safeWindowsInstalledVersion(scope.installedVersion), row.outcome,
    row.basis, row.reference, row.recordedAt].join("|");
}

export function summarizeWindowsTriage(draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft) {
  const review = summarizeWindowsFieldReview(draft, scope);
  const rows = review.rows.filter(row => row.state === "finding" || row.state === "blocked")
    .map(row => {
      const plan = plans[row.id] ?? defaultTriageEntry;
      const linked = plan.sourceKey !== "" && plan.sourceKey === windowsFindingSourceKey(row, scope);
      let gate: WindowsTriageGate;
      if (!row.evidenceReady) gate = "source_gap";
      else if (plan.sourceKey && !linked) gate = "source_changed";
      else if (!plan.sourceKey || plan.decision === "unreviewed") gate = "untriaged";
      else if (plan.priority === "unassigned") gate = "priority_needed";
      else if (plan.decision === "defer") gate = "on_hold";
      else if (plan.decision === "retest_only") gate = "retest_only";
      else if (plan.decision === "investigate") gate = "investigation_review";
      else if (plan.reproduction !== "reproduced" || safeWindowsFieldReference(plan.reproductionReference).length < 4 ||
        safeWindowsFieldReference(plan.reproductionReference) === row.reference)
        gate = "reproduction_gap";
      else gate = "owner_scope_review";
      return { ...row, plan, gate, linked, action: row.next };
    }).sort((a, b) => {
      // Only source-linked priorities are rankable. Never infer severity from a simulated or incomplete check.
      const rank = (row: typeof a) => row.evidenceReady && row.linked && row.plan.priority !== "unassigned"
        ? Number(row.plan.priority.slice(1)) : 9;
      return rank(a) - rank(b) || windowsFieldCases.findIndex(test => test.id === a.id) -
        windowsFieldCases.findIndex(test => test.id === b.id);
    });
  return {
    rows, candidates: rows.length,
    sourceLinked: rows.filter(row => row.evidenceReady && row.linked).length,
    needsEvidence: rows.filter(row => row.gate === "source_gap" || row.gate === "source_changed").length,
    ownerScoping: rows.filter(row => row.gate === "owner_scope_review" || row.gate === "investigation_review").length,
    outstandingPassEvidence: review.needsEvidence,
    independentlyVerified: false as const,
    repairsAuthorized: false as const,
  };
}

/** Import the exact redacted Build 228 copy format, rejecting partial/mismatched rows. */
export function parseWindowsFieldHandoff228(input: string):
  | { ok: true; draft: WindowsFieldDraft; scope: WindowsFieldScope }
  | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error });
  if (input.length > 16000 || input.length < 200) return bad("Handoff size is invalid. Copy the full Build 228 owner handoff.");
  const lines = input.replace(/\r\n/g, "\n").trim().split("\n");
  if (lines[0] !== "Rosevear AI Hub — Build 228 owner field regression handoff" ||
      lines[1] !== `Schema: ${WINDOWS_FIELD_SCHEMA}` ||
      !lines.includes("OWNER REPORTED ONLY — not a verified installation, CI result or independent reviewer approval.")) {
    return bad("This is not the recognized Build 228 owner-only handoff.");
  }
  const versionLine = lines.find(line => line.startsWith("Installed version (owner-entered): "));
  const witnessLine = lines.find(line => line.startsWith("Physical Windows witness attested: "));
  if (!versionLine || !witnessLine) return bad("Installed version or owner witness metadata is missing.");
  const version = versionLine.slice("Installed version (owner-entered): ".length);
  if (version !== "NOT RECORDED" && version !== safeWindowsInstalledVersion(version)) {
    return bad("Installed version contains unsupported characters.");
  }
  const witness = witnessLine.slice("Physical Windows witness attested: ".length);
  if (witness !== "YES (owner-reported)" && witness !== "NO") return bad("Witness status is invalid.");
  const scope: WindowsFieldScope = {
    installedVersion: version === "NOT RECORDED" ? "" : version,
    physicallyWitnessed: witness === "YES (owner-reported)",
  };
  const draft: WindowsFieldDraft = {};
  for (const test of windowsFieldCases) {
    const prefix = `${test.area} / ${test.title}: `;
    const matches = lines.filter(line => line.startsWith(prefix));
    if (matches.length !== 1) return bad(`A unique source row is missing for ${test.title}.`);
    const parts = matches[0].slice(prefix.length).split(" | ");
    if (parts.length !== 4) return bad(`Evidence format is invalid for ${test.title}.`);
    const [state, basis, ref, time] = parts;
    const acceptedStates = ["NOT_TESTED", "PASS", "FINDING", "BLOCKED", "NEEDS_EVIDENCE"];
    if (!acceptedStates.includes(state)) return bad(`Unknown field result for ${test.title}.`);
    if (ref !== "no local reference" && ref !== safeWindowsFieldReference(ref)) return bad("Unsafe local reference in handoff.");
    const raw = {
      outcome: (state === "NEEDS_EVIDENCE" ? "pass" : state.toLowerCase()) as WindowsFieldOutcome,
      basis, reference: ref === "no local reference" ? "" : ref,
      recordedAt: time === "not recorded" ? "" : time,
    };
    const normalized = normalizeWindowsObservation(raw);
    if (normalized.outcome !== raw.outcome || normalized.basis !== basis || normalized.recordedAt !== raw.recordedAt) {
      return bad(`Unsupported source fields for ${test.title}.`);
    }
    draft[test.id] = normalized;
  }
  const summary = summarizeWindowsFieldReview(draft, scope);
  const totals = `Pass: ${summary.ownerReportedPasses}; finding: ${summary.findings}; blocked: ${summary.blocked}; evidence incomplete: ${summary.needsEvidence}; not tested: ${summary.notTested}`;
  if (!lines.includes(totals)) return bad("The handoff totals do not match the individual owner observations.");
  for (const row of summary.rows) {
    const prefix = `${row.area} / ${row.title}: `;
    if (!lines.some(line => line.startsWith(`${prefix}${row.state.toUpperCase()} | `))) {
      return bad(`The claimed result contradicts its evidence fields for ${row.title}.`);
    }
  }
  return { ok: true, draft, scope };
}

export function formatWindowsFindingPlan229(draft: WindowsFieldDraft, scope: WindowsFieldScope, plans: WindowsTriageDraft) {
  const summary = summarizeWindowsTriage(draft, scope, plans);
  return [
    "Rosevear AI Hub — Build 229 owner finding triage and source-matched repair proposal",
    `Source schema: ${WINDOWS_FIELD_SCHEMA}`,
    "OWNER REPORTED / PROPOSED ONLY — NO REPAIRS APPROVED, INSTALLED WINDOWS RESULTS VERIFIED OR ACTIONS RUN.",
    `Installed version (owner-reported): ${safeWindowsInstalledVersion(scope.installedVersion) || "NOT RECORDED"}`,
    `Owner-witnessed (self-attested): ${scope.physicallyWitnessed ? "YES" : "NO"}`,
    `Findings/blockers: ${summary.candidates}; source-linked: ${summary.sourceLinked}; evidence gaps: ${summary.needsEvidence}; owner-scoping candidates: ${summary.ownerScoping}`,
    ...summary.rows.map(row => `${row.id} / ${row.title} | Build228 ${row.outcome} | source ${row.reference || "MISSING"} | source time ${row.recordedAt || "MISSING"} | priority ${row.plan.priority} | reproduction ${row.plan.reproduction} | retest ${safeWindowsFieldReference(row.plan.reproductionReference) || "MISSING"} | decision ${row.plan.decision} | gate ${row.gate} | proposed action: ${row.action}`),
    ...(summary.rows.length ? [] : ["NO AUTHENTIC OWNER-RECORDED BUILD 228 FINDINGS LOADED — gather field evidence first."]),
    "All repair candidates require a separate owner scoping decision, code change and fresh Windows retest; this export authorizes nothing.",
    "Six-app integration: DISCONNECTED / HOLD; private relay: OFF; QL-275: UNDER REVIEW; vault: SECURITY HOLD.",
    "No secret, IP, address, provider credential, camera image or private log content belongs in this plan.",
  ].join("\n");
}
