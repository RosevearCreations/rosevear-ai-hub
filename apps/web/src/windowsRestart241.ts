/** Build 241: owner-only reconciliation of a genuine Build 240 restart report. No host actions. */
import {
  restart240Dependencies, summarizeRestart240, exportRestart240Handoff, importRestart240Handoff,
  type Restart240DependencyId, type Restart240Draft,
} from "./windowsRestart240";

export type Restart241Source = "none" | "direct_screen" | "task_history" | "local_log";
export type Restart241Decision =
  "pending" | "defer" | "request_retest" | "request_independent_proof" | "request_repair_review";
export type Restart241Entry = {
  source: Restart241Source;
  sourceReference: string;
  acknowledged: boolean;
  sourceAt: string;
  sourceKey: string;
  decision: Restart241Decision;
  scope: Restart240DependencyId | "unselected";
  rollbackReference: string;
  decisionReference: string;
  decisionAcknowledged: boolean;
  decisionAt: string;
  decisionKey: string;
};
export type Restart241Entries = Partial<Record<Restart240DependencyId, Restart241Entry>>;
export const emptyRestart241Entry: Restart241Entry = {
  source: "none", sourceReference: "", acknowledged: false, sourceAt: "", sourceKey: "",
  decision: "pending", scope: "unselected", rollbackReference: "",
  decisionReference: "", decisionAcknowledged: false, decisionAt: "", decisionKey: "",
};
const sourceChoices = new Set<Restart241Source>(["none", "direct_screen", "task_history", "local_log"]);
const decisions = new Set<Restart241Decision>([
  "pending", "defer", "request_retest", "request_independent_proof", "request_repair_review",
]);
const validCode = (value: string) => /^[A-Za-z0-9_-]{4,80}$/.test(value);
const validTime = (value: string) => !!value && Number.isFinite(Date.parse(value));
const ownerCaseStatuses = new Set(["failed", "partial", "not_configured"]);
const repairStatuses = new Set(["failed", "partial"]);
export type Restart241Gate =
  "await_real_restart" | "no_current_case" | "upstream_evidence_hold" |
  "source_missing" | "source_reference_missing" | "source_reference_duplicate" |
  "source_witness_missing" | "source_stale" | "source_reviewed" |
  "decision_pending" | "decision_reference_missing" | "decision_reference_duplicate" |
  "decision_not_acknowledged" | "decision_stale" | "repair_status_ineligible" |
  "repair_scope_mismatch" | "rollback_missing" |
  "deferred_under_review" | "retest_requested" | "independent_proof_requested" |
  "conditional_repair_review_requested";

type Restart241SourceRow = { id: Restart240DependencyId; originalGate: string; original: { reference: string; recordedAt: string; snapshotKey: string } };
export function source241Key(draft: Restart240Draft, row: Restart241SourceRow, entry: Restart241Entry) {
  return JSON.stringify({
    baseline: draft.preflight.snapshotKey, reboot: draft.reboot.snapshotKey,
    id: row.id, originalStatus: row.originalGate, originalCode: row.original.reference,
    originalTime: row.original.recordedAt, originalSnapshot: row.original.snapshotKey,
    source: entry.source, sourceReference: entry.sourceReference, witnessed: entry.acknowledged,
  });
}
export function decision241Key(entry: Restart241Entry) {
  return JSON.stringify({
    sourceKey: entry.sourceKey, sourceAt: entry.sourceAt,
    decision: entry.decision, scope: entry.scope,
    rollbackReference: entry.rollbackReference, decisionReference: entry.decisionReference,
    acknowledged: entry.decisionAcknowledged,
  });
}
function relatedCodes(draft: Restart240Draft, entries: Restart241Entries): string[] {
  return [
    draft.preflight.hubBackupReference, draft.preflight.haBackupReference,
    draft.preflight.baselineReference, draft.reboot.reference,
    ...restart240Dependencies.map(dep => draft.observations[dep.id]?.reference ?? ""),
    ...restart240Dependencies.flatMap(dep => {
      const entry = entries[dep.id];
      return entry ? [entry.sourceReference, entry.decisionReference, entry.rollbackReference] : [];
    }),
  ].filter(Boolean);
}
export function summarizeRestart241(draft: Restart240Draft | null, entries: Restart241Entries) {
  const baseline = draft ? summarizeRestart240(draft) : null;
  const restartReady = baseline?.rebootGate === "reboot_recorded";
  const used = draft ? relatedCodes(draft, entries) : [];
  const sourceUsed = draft ? [
    draft.preflight.hubBackupReference, draft.preflight.haBackupReference,
    draft.preflight.baselineReference, draft.reboot.reference,
    ...restart240Dependencies.map(dep => draft.observations[dep.id]?.reference ?? ""),
    ...restart240Dependencies.map(dep => entries[dep.id]?.sourceReference ?? ""),
  ].filter(Boolean) : [];
  const decisionUsed = [
    ...sourceUsed, ...restart240Dependencies.map(dep => entries[dep.id]?.decisionReference ?? ""),
  ].filter(Boolean);
  const rows = (baseline?.rows ?? restart240Dependencies.map(dep => ({
    ...dep, entry: { status: "not_checked", source: "none", reference: "", recordedAt: "", snapshotKey: "" },
    gate: "await_restart",
  }))).map(row => {
    const entry = { ...emptyRestart241Entry, ...entries[row.id] };
    const eligible = restartReady && ownerCaseStatuses.has(row.gate);
    const sourceGate: Restart241Gate = !restartReady ? "await_real_restart" :
      row.gate === "owner_observed_working" ? "no_current_case" :
      !eligible ? "upstream_evidence_hold" :
      !sourceChoices.has(entry.source) || entry.source === "none" ? "source_missing" :
      !validCode(entry.sourceReference) ? "source_reference_missing" :
      sourceUsed.filter(code => code === entry.sourceReference).length !== 1 ? "source_reference_duplicate" :
      !entry.acknowledged ? "source_witness_missing" :
      !validTime(entry.sourceAt) ||
        Date.parse(entry.sourceAt) <= Date.parse(row.entry.recordedAt) ||
        entry.sourceKey !== source241Key(draft!, { id: row.id, originalGate: row.gate, original: row.entry }, entry) ? "source_stale" :
      "source_reviewed";
    let decisionGate: Restart241Gate = sourceGate;
    if (sourceGate === "source_reviewed") {
      decisionGate =
        !decisions.has(entry.decision) || entry.decision === "pending" ? "decision_pending" :
        !validCode(entry.decisionReference) ? "decision_reference_missing" :
        decisionUsed.filter(code => code === entry.decisionReference).length !== 1 ? "decision_reference_duplicate" :
        !entry.decisionAcknowledged ? "decision_not_acknowledged" :
        !validTime(entry.decisionAt) ||
          Date.parse(entry.decisionAt) <= Date.parse(entry.sourceAt) ||
          entry.decisionKey !== decision241Key(entry) ? "decision_stale" :
        entry.decision === "request_repair_review" && !repairStatuses.has(row.gate)
          ? "repair_status_ineligible" :
        entry.decision === "request_repair_review" && entry.scope !== row.id
          ? "repair_scope_mismatch" :
        entry.decision === "request_repair_review" &&
          (!validCode(entry.rollbackReference) ||
            used.filter(code => code === entry.rollbackReference).length !== 1)
          ? "rollback_missing" :
        entry.decision === "defer" ? "deferred_under_review" :
        entry.decision === "request_retest" ? "retest_requested" :
        entry.decision === "request_independent_proof" ? "independent_proof_requested" :
        "conditional_repair_review_requested";
    }
    return {
      ...row, entry, original: row.entry, originalGate: row.gate,
      eligible, sourceGate, decisionGate,
      repairCandidate: eligible && repairStatuses.has(row.gate),
    };
  });
  return {
    restartGate: baseline?.rebootGate ?? "preflight_hold",
    rows,
    cases: rows.filter(row => row.eligible).length,
    sourceReviewed: rows.filter(row => row.sourceGate === "source_reviewed").length,
    repairReviewRequests: rows.filter(row => row.decisionGate === "conditional_repair_review_requested").length,
    unresolved: rows.filter(row => row.originalGate !== "owner_observed_working").length,
    firstUnresolved: rows.find(row => row.originalGate !== "owner_observed_working") ?? null,
    ownerOnly: true as const, independentVerification: false as const,
    repairAuthorized: false as const, repairExecuted: false as const,
    changesMade: 0 as const, liveCommands: 0 as const,
    sixApps: "DISCONNECTED / HOLD" as const, relay: "OFF" as const,
    vault: "SECURITY HOLD" as const, ql275: "UNDER REVIEW" as const,
  };
}
export const restart241GateLabels: Record<Restart241Gate, string> = {
  await_real_restart: "Await original witnessed Build 240 restart",
  no_current_case: "Working in owner report — no repair case",
  upstream_evidence_hold: "Incomplete / invalid original observation — retest first",
  source_missing: "Select an actual source checked",
  source_reference_missing: "Distinct evidence source code required",
  source_reference_duplicate: "Evidence source code already used",
  source_witness_missing: "Owner source acknowledgement required",
  source_stale: "Source evidence stale or does not match original report",
  source_reviewed: "Source observed by owner only; awaiting decision",
  decision_pending: "Await a separate owner disposition",
  decision_reference_missing: "New decision receipt code required",
  decision_reference_duplicate: "Decision code already used",
  decision_not_acknowledged: "Owner request-only acknowledgement missing",
  decision_stale: "Decision is stale or does not match source",
  repair_status_ineligible: "No observed failure / partial result to review for repair",
  repair_scope_mismatch: "Exact failing dependency scope required",
  rollback_missing: "Distinct rollback plan code required",
  deferred_under_review: "Owner deferred — remains Under Review",
  retest_requested: "Owner requested real on-device retest only",
  independent_proof_requested: "Owner requested independent verification only",
  conditional_repair_review_requested: "Conditional repair REVIEW requested — no authorization",
};
export function formatRestart241Packet(draft: Restart240Draft | null, entries: Restart241Entries) {
  const summary = summarizeRestart241(draft, entries);
  const safe = (s: string) => validCode(s) ? s : "MISSING / INVALID";
  return [
    "Rosevear AI Hub Build 241 — post-restart owner decision packet",
    "Source-only owner report — NOT independent evidence or repair authorization",
    "Build 240 restart gate: " + summary.restartGate,
    "Installed version is owner-entered; source release GREEN is not installed-Windows verification.",
    "Cases: " + summary.cases + "; source reports: " + summary.sourceReviewed +
      "; conditional repair REVIEW requests: " + summary.repairReviewRequests,
    ...summary.rows.map(row =>
      row.id + ": Build240=" + row.originalGate + "; original=" + safe(row.original.reference) +
      "; Build241=" + row.decisionGate + "; source=" + safe(row.entry.sourceReference) +
      "; owner decision=" + safe(row.entry.decisionReference)),
    "First unresolved dependency: " + (summary.firstUnresolved?.title ?? "none in owner report"),
    "Independent verification: NO; actual repair authorization: NO; changes executed: 0.",
    "Six apps DISCONNECTED/HOLD; private relay OFF; QL-275 UNDER REVIEW; vault SECURITY HOLD.",
    "No IP, URL, provider name, camera ID, raw log, credentials or private message is included.",
  ].join("\n");
}


/** Private, code-only, versioned Build 241 handoff for Build 242.
 * This is a self-reported decision chain, NOT authenticated evidence or repair authority.
 */
export const restart241HandoffSchema = "rosevear-hub-restart-review-241/v1" as const;
const safeHandoffCode = (value: unknown): string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{0,80}$/.test(value) ? value : "";
const safeHandoffTime = (value: unknown): string =>
  typeof value === "string" && value.length <= 40 && validTime(value) ? value : "";
const isEntryScope = (value: unknown): value is Restart241Entry["scope"] =>
  value === "unselected" || restart240Dependencies.some(dep => dep.id === value);

export function exportRestart241Handoff(source: Restart240Draft, entries: Restart241Entries): string {
  const cleanSource = JSON.parse(exportRestart240Handoff(source)) as unknown;
  const safeEntries: Record<string, unknown> = {};
  for (const dep of restart240Dependencies) {
    const v = { ...emptyRestart241Entry, ...entries[dep.id] };
    safeEntries[dep.id] = {
      source: sourceChoices.has(v.source) ? v.source : "none",
      sourceReference: safeHandoffCode(v.sourceReference),
      acknowledged: v.acknowledged === true,
      sourceAt: safeHandoffTime(v.sourceAt),
      sourceKey: typeof v.sourceKey === "string" && v.sourceKey.length <= 5000 ? v.sourceKey : "",
      decision: decisions.has(v.decision) ? v.decision : "pending",
      scope: isEntryScope(v.scope) ? v.scope : "unselected",
      rollbackReference: safeHandoffCode(v.rollbackReference),
      decisionReference: safeHandoffCode(v.decisionReference),
      decisionAcknowledged: v.decisionAcknowledged === true,
      decisionAt: safeHandoffTime(v.decisionAt),
      decisionKey: typeof v.decisionKey === "string" && v.decisionKey.length <= 5000 ? v.decisionKey : "",
    };
  }
  return JSON.stringify({ schema: restart241HandoffSchema, restart240: cleanSource,
    entries: safeEntries }, null, 2);
}

export function importRestart241Handoff(raw: string): {
  restart240: Restart240Draft; entries: Restart241Entries;
} {
  if (raw.length > 40000) throw new Error("Build 241 handoff size limit");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" ||
    (parsed as { schema?: unknown }).schema !== restart241HandoffSchema)
    throw new Error("Build 241 handoff schema mismatch");
  const root = parsed as Record<string, unknown>;
  if (!root.restart240 || typeof root.restart240 !== "object")
    throw new Error("Missing original Build 240 source");
  const restart240 = importRestart240Handoff(JSON.stringify(root.restart240));
  if (summarizeRestart240(restart240).rebootGate !== "reboot_recorded")
    throw new Error("Real owner restart evidence missing");
  const rawEntries = root.entries && typeof root.entries === "object" && !Array.isArray(root.entries)
    ? root.entries as Record<string, unknown> : {};
  const entries: Restart241Entries = {};
  for (const dep of restart240Dependencies) {
    const rawEntry = rawEntries[dep.id];
    const v = rawEntry && typeof rawEntry === "object" && !Array.isArray(rawEntry)
      ? rawEntry as Record<string, unknown> : {};
    const e: Restart241Entry = {
      source: sourceChoices.has(v.source as Restart241Source)
        ? v.source as Restart241Source : "none",
      sourceReference: safeHandoffCode(v.sourceReference),
      acknowledged: v.acknowledged === true,
      sourceAt: safeHandoffTime(v.sourceAt),
      sourceKey: "",
      decision: decisions.has(v.decision as Restart241Decision)
        ? v.decision as Restart241Decision : "pending",
      scope: isEntryScope(v.scope) ? v.scope : "unselected",
      rollbackReference: safeHandoffCode(v.rollbackReference),
      decisionReference: safeHandoffCode(v.decisionReference),
      decisionAcknowledged: v.decisionAcknowledged === true,
      decisionAt: safeHandoffTime(v.decisionAt), decisionKey: "",
    };
    const row = summarizeRestart241(restart240, {}).rows.find(x => x.id === dep.id);
    if (row && v.sourceKey === source241Key(restart240, row, e))
      e.sourceKey = source241Key(restart240, row, e);
    if (v.decisionKey === decision241Key(e))
      e.decisionKey = decision241Key(e);
    entries[dep.id] = e;
  }
  return { restart240, entries };
}
