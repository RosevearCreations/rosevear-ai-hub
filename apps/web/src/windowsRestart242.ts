/** Build 242 — field-source bound restart retest and owner repair decision handoff.
 * Pure local calculations: no host commands, network, backups, VM, or repair actions.
 */
import { restart240Dependencies, type Restart240DependencyId } from "./windowsRestart240";
import {
  summarizeRestart241, type Restart241Entries, type Restart241Gate,
} from "./windowsRestart241";
import type { Restart240Draft } from "./windowsRestart240";

export type Restart242Handoff = { restart240: Restart240Draft; entries: Restart241Entries };
export type Restart242Status = "not_observed" | "working" | "failed" | "partial" | "not_configured";
export type Restart242Basis = "none" | "direct_screen" | "task_history" | "local_log";
export type Restart242Disposition =
  "pending" | "defer" | "request_retest" | "request_independent_proof" | "request_repair_review";
export type Restart242Entry = {
  status: Restart242Status;
  basis: Restart242Basis;
  retestReference: string;
  ownerWitnessed: boolean;
  retestAt: string;
  retestKey: string;
  disposition: Restart242Disposition;
  repairScope: Restart240DependencyId | "unselected";
  rollbackReference: string;
  ownerDecisionReference: string;
  requestOnlyAcknowledged: boolean;
  decisionAt: string;
  decisionKey: string;
};
export type Restart242Entries = Partial<Record<Restart240DependencyId, Restart242Entry>>;
export const emptyRestart242Entry: Restart242Entry = {
  status: "not_observed", basis: "none", retestReference: "",
  ownerWitnessed: false, retestAt: "", retestKey: "",
  disposition: "pending", repairScope: "unselected", rollbackReference: "",
  ownerDecisionReference: "", requestOnlyAcknowledged: false,
  decisionAt: "", decisionKey: "",
};
export type Restart242Gate =
  "await_original_restart" | "await_build241_decision" |
  "first_dependency_hold" | "await_actual_retest" | "source_missing" |
  "reference_missing" | "reference_duplicate" | "owner_witness_missing" |
  "retest_stale" | "owner_retest_recorded" | "owner_recovered_unverified" |
  "owner_still_failed" | "owner_partially_recovered" | "not_configured" |
  "decision_pending" | "decision_reference_missing" |
  "decision_reference_duplicate" | "decision_ack_missing" |
  "decision_stale" | "repair_not_needed" | "scope_mismatch" |
  "rollback_missing" | "deferred_under_review" | "more_retest_requested" |
  "independent_proof_requested" | "repair_authorization_review_requested";

const statuses = new Set<Restart242Status>(
  ["not_observed", "working", "failed", "partial", "not_configured"]);
const bases = new Set<Restart242Basis>(["none", "direct_screen", "task_history", "local_log"]);
const dispositions = new Set<Restart242Disposition>(
  ["pending", "defer", "request_retest", "request_independent_proof", "request_repair_review"]);
const eligibleDecision = new Set<Restart241Gate>(
  ["retest_requested", "independent_proof_requested", "conditional_repair_review_requested"]);
const code = (s: string): boolean => /^[A-Za-z0-9_-]{4,80}$/.test(s);
const time = (s: string): boolean => !!s && Number.isFinite(Date.parse(s));
const validId = (s: Restart242Entry["repairScope"]) =>
  s === "unselected" || restart240Dependencies.some(x => x.id === s);

type SourceRow = ReturnType<typeof summarizeRestart241>["rows"][number];
export function retest242Key(src: Restart242Handoff, row: SourceRow, entry: Restart242Entry) {
  return JSON.stringify({
    p: src.restart240.preflight.snapshotKey, q: src.restart240.reboot.snapshotKey,
    dependency: row.id, originalStatus: row.originalGate,
    originalCode: row.original.reference, originalSnapshot: row.original.snapshotKey,
    decision: row.decisionGate, decisionCode: row.entry.decisionReference,
    decisionAt: row.entry.decisionAt, decisionKey: row.entry.decisionKey,
    retestStatus: entry.status, basis: entry.basis,
    retestCode: entry.retestReference, ownerWitnessed: entry.ownerWitnessed,
  });
}
export function decision242Key(entry: Restart242Entry) {
  return JSON.stringify({
    retest: entry.retestKey, retestAt: entry.retestAt,
    disposition: entry.disposition, scope: entry.repairScope,
    rollback: entry.rollbackReference, decision: entry.ownerDecisionReference,
    acknowledged: entry.requestOnlyAcknowledged,
  });
}
function knownRefs(src: Restart242Handoff | null, entries: Restart242Entries): string[] {
  if (!src) return [];
  const p = src.restart240;
  return [
    p.preflight.hubBackupReference, p.preflight.haBackupReference,
    p.preflight.baselineReference, p.reboot.reference,
    ...restart240Dependencies.flatMap(dep => {
      const b240 = p.observations[dep.id], b241 = src.entries[dep.id],
        b242 = entries[dep.id];
      return [
        b240?.reference ?? "", b241?.sourceReference ?? "",
        b241?.decisionReference ?? "", b241?.rollbackReference ?? "",
        b242?.retestReference ?? "", b242?.ownerDecisionReference ?? "",
        b242?.rollbackReference ?? "",
      ];
    }),
  ].filter(Boolean);
}
export function summarizeRestart242(src: Restart242Handoff | null, entries: Restart242Entries) {
  const review = src ? summarizeRestart241(src.restart240, src.entries) : null;
  const refs = knownRefs(src, entries);
  const firstUnresolved = review?.firstUnresolved ?? null;
  const rows = (review?.rows ?? []).map(row => {
    const entry = { ...emptyRestart242Entry, ...entries[row.id] };
    const eligible = eligibleDecision.has(row.decisionGate);
    const firstInOrder = firstUnresolved?.id === row.id;
    const base: Restart242Gate = !src || review?.restartGate !== "reboot_recorded"
      ? "await_original_restart" :
      !eligible ? "await_build241_decision" :
      !firstInOrder ? "first_dependency_hold" :
      !statuses.has(entry.status) || entry.status === "not_observed" ? "await_actual_retest" :
      !bases.has(entry.basis) || entry.basis === "none" ? "source_missing" :
      !code(entry.retestReference) ? "reference_missing" :
      refs.filter(x => x === entry.retestReference).length !== 1 ? "reference_duplicate" :
      !entry.ownerWitnessed ? "owner_witness_missing" :
      !time(entry.retestAt) || Date.parse(entry.retestAt) <= Date.parse(row.entry.decisionAt) ||
      entry.retestKey !== retest242Key(src, row, entry) ? "retest_stale" :
      entry.status === "working" ? "owner_recovered_unverified" :
      entry.status === "failed" ? "owner_still_failed" :
      entry.status === "partial" ? "owner_partially_recovered" :
      entry.status === "not_configured" ? "not_configured" : "owner_retest_recorded";
    let gate: Restart242Gate = base;
    if (["owner_recovered_unverified","owner_still_failed","owner_partially_recovered",
      "not_configured", "owner_retest_recorded"].includes(base)) {
      gate = !dispositions.has(entry.disposition) || entry.disposition === "pending"
        ? "decision_pending" :
        !code(entry.ownerDecisionReference) ? "decision_reference_missing" :
        refs.filter(x => x === entry.ownerDecisionReference).length !== 1
          ? "decision_reference_duplicate" :
        !entry.requestOnlyAcknowledged ? "decision_ack_missing" :
        !time(entry.decisionAt) || Date.parse(entry.decisionAt) <= Date.parse(entry.retestAt) ||
          entry.decisionKey !== decision242Key(entry) ? "decision_stale" :
        entry.disposition === "request_repair_review" &&
          !(entry.status === "failed" || entry.status === "partial") ? "repair_not_needed" :
        entry.disposition === "request_repair_review" &&
          (!validId(entry.repairScope) || entry.repairScope !== row.id) ? "scope_mismatch" :
        entry.disposition === "request_repair_review" &&
          (!code(entry.rollbackReference) || refs.filter(x => x === entry.rollbackReference).length !== 1)
          ? "rollback_missing" :
        entry.disposition === "defer" ? "deferred_under_review" :
        entry.disposition === "request_retest" ? "more_retest_requested" :
        entry.disposition === "request_independent_proof" ? "independent_proof_requested" :
        "repair_authorization_review_requested";
    }
    return { ...row, retest: entry, eligible, firstInOrder,
      retestGate: base, gate };
  });
  return {
    restartGate: review?.restartGate ?? "preflight_hold",
    rows, firstUnresolved,
    cases: rows.filter(x => x.eligible).length,
    readyToRetest: rows.filter(x => x.eligible && x.firstInOrder).length,
    ownerReportedRecovered: rows.filter(x => x.retestGate === "owner_recovered_unverified").length,
    ownerStillFailed: rows.filter(x => x.retestGate === "owner_still_failed" ||
      x.retestGate === "owner_partially_recovered").length,
    repairReviewRequests: rows.filter(x => x.gate === "repair_authorization_review_requested").length,
    independentlyVerified: false as const, repairAuthorized: false as const,
    repairExecuted: false as const, serviceActions: 0 as const,
    installedWindowsVerified: false as const,
    sixApps: "DISCONNECTED / HOLD" as const, relay: "OFF" as const,
    vault: "SECURITY HOLD" as const, ql275: "UNDER REVIEW" as const,
  };
}
export const restart242Labels: Record<Restart242Gate, string> = {
  await_original_restart: "Actual Build 240 restart evidence missing",
  await_build241_decision: "No current source-matched Build 241 retest decision",
  first_dependency_hold: "Earlier startup dependency unresolved — investigate it first",
  await_actual_retest: "Await an actual supervised Windows dependency retest",
  source_missing: "Record the observed local source",
  reference_missing: "Distinct owner retest code required",
  reference_duplicate: "Evidence code reused — HOLD",
  owner_witness_missing: "Owner retest witness missing",
  retest_stale: "Retest stale or no longer matches Build 241 decision",
  owner_retest_recorded: "Owner retest recorded — independent verification still missing",
  owner_recovered_unverified: "Owner reports recovered — independent verification missing",
  owner_still_failed: "Owner reports still failed — HOLD",
  owner_partially_recovered: "Owner reports partial recovery — HOLD",
  not_configured: "Not configured / cannot verify — HOLD",
  decision_pending: "Await owner next-action request",
  decision_reference_missing: "New owner decision code required",
  decision_reference_duplicate: "Decision code reused — HOLD",
  decision_ack_missing: "Owner request-only acknowledgment missing",
  decision_stale: "Decision stale or no longer matches retest",
  repair_not_needed: "Repair review not allowed without failed/partial retest",
  scope_mismatch: "Repair review scope must match exact failure",
  rollback_missing: "Separate rollback plan reference required",
  deferred_under_review: "Owner deferred — remains Under Review",
  more_retest_requested: "Owner requested another on-device retest",
  independent_proof_requested: "Owner requested independent evidence",
  repair_authorization_review_requested: "Conditional REPAIR REVIEW requested, NOT authorized",
};
export function formatRestart242Packet(src: Restart242Handoff | null, entries: Restart242Entries) {
  const s = summarizeRestart242(src, entries);
  const safe = (v: string) => code(v) ? v : "MISSING";
  return [
    "Rosevear AI Hub — Build 242 supervised restart exception owner handoff",
    "Source CI is NOT installed Windows recovery, external verification or repair authorization.",
    "Build 240 restart: " + s.restartGate,
    "First unresolved dependency: " + (s.firstUnresolved?.title ?? "none in owner report"),
    "Eligible Build 241 cases: " + s.cases + "; ready for first-failure retest: " + s.readyToRetest,
    "Owner-reported recovered: " + s.ownerReportedRecovered +
      "; still failed/partial: " + s.ownerStillFailed +
      "; review REQUESTS: " + s.repairReviewRequests,
    ...s.rows.filter(x => x.eligible).map(x => x.id +
      " original=" + x.originalGate + " Build241=" + x.decisionGate +
      " retest=" + x.retestGate + " request=" + x.gate +
      " original-code=" + safe(x.original.reference) +
      " retest-code=" + safe(x.retest.retestReference) +
      " decision-code=" + safe(x.retest.ownerDecisionReference)),
    "Independent Windows acceptance: NO; repair authorized: NO; repair executed: NO; OS actions: 0.",
    "Six apps DISCONNECTED/HOLD; private relay OFF; vault SECURITY HOLD; QL-275 UNDER REVIEW.",
    "Only source-safe codes; never export IPs, URLs, login names, camera IDs, credentials or raw logs.",
  ].join("\n");
}
