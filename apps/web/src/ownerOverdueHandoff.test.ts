import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { recordFollowupDecision } from "./ownerFollowupDecisionReplay";
import { createRecurrenceResolutionReceipt, recordRecurrenceResolution,
  type RecurrenceResolutionEvidence } from "./ownerRecurrenceResolution";
import { captureHandoffSnapshot, createOverdueHandoffReceipt, deriveOverdueHandoffWatch,
  parseOverdueHandoffReceipt, recordOverdueHandoff, type ManualHandoffCategory, type OverdueHandoffEvidence,
  type OverdueHandoffReceipt } from "./ownerOverdueHandoff";

const env: TrialEnvironment = { installed_version: "0.0.6-build156", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const at = (minute: number) => new Date(Date.parse("2026-10-14T08:00:00Z") + minute * 60_000).toISOString();
const oldImport = { trials: 0, checks: 0, links: 0, followups: 0, decisions: 0, resolutions: 0, handoffs: 0 };
const upstream = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };
const day = 1440;

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, at(0));
  let handoffs = createRepairHandoff(history, [], "cameras", at(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, at(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, at(3));
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, at(4));
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, at(5));
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, at(6));
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], upstream,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, at(7));
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs, [], [], upstream,
    { link_index: 0, criterion: "field_hold", personally_reviewed: true }, at(19));
  const decisions = recordFollowupDecision(history, checks, links, followups, [], env, handoffs, [], [], upstream,
    { source_followup_index: 0, decision: "REPEAT_TRIAL_REQUESTED", personally_reviewed: true,
      separate_reviewer: true }, at(22));
  return { history, handoffs, checks, links, followups, decisions,
    resolutions: [] as RecurrenceResolutionEvidence[], reviews: [], reassessments: [] };
}
type Fixture = ReturnType<typeof fixture>;
function trial(f: Fixture, outcome: "passed" | "issue", minute: number) {
  f.history = recordTrialObservation(f.history, env, { case_id: "cameras", outcome,
    finding: outcome === "passed" ? "none" : "playback_missing",
    next_owner: "camera_operator", witnessed: true }, at(minute));
  return f;
}
function source(f: Fixture, alias: string, minute: number) {
  f.checks = recordSourceIdentityCheck(f.history, f.checks, env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: alias, personally_witnessed: true }, at(minute));
  return f;
}
function resolution(f: Fixture) {
  f.resolutions = recordRecurrenceResolution(f.history, f.checks, f.links, f.decisions, [], env,
    oldImport, { decision_index: 0, trial_index: f.history.length - 1,
      personally_witnessed: true, hold_acknowledged: true }, at(33));
  return f;
}
function record(f: Fixture, evidence: OverdueHandoffEvidence[] = [], minute = 22 + day * 4,
  category: ManualHandoffCategory = "OVERDUE_INDEPENDENT_REVIEW_REQUEST", imports = oldImport,
  environment = env) {
  return recordOverdueHandoff(f.history, f.checks, f.links, f.decisions, f.resolutions, evidence,
    environment, imports, { decision_index: 0, category, personally_reviewed: true,
      hold_acknowledged: true }, at(minute));
}
function receipt(f: Fixture, evidence: OverdueHandoffEvidence[], exportedAt = 22 + day * 5) {
  return createOverdueHandoffReceipt(env, [], f.history, f.handoffs, f.reviews, f.checks,
    f.links, f.reassessments, f.followups, f.decisions, f.resolutions, evidence, at(exportedAt));
}

describe("Build 156 independent overdue handoff and reopened trial comparison", () => {
  it("derives the exact decision age without an automated escalation or invented reviewer outcome", () => {
    const f = fixture();
    const before = captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions, 0, at(60));
    expect(before).toMatchObject({ decision_index: 0, age_band: "RECENT_UNDER_24H", overdue: false,
      resolution_index: null, newest_trial_index: null, reopened_comparison: "NO_NEW_OWNER_TRIAL",
      source_alias_comparison: "NO_LATER_SOURCE_CHECK", source_linked_at: at(7), decision_at: at(22) });
    expect(deriveOverdueHandoffWatch(f.history, f.checks, f.links, f.decisions, f.resolutions, [],
      oldImport, at(60))[0].eligible_for_manual_handoff).toBe(false);
    const later = captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions, 0, at(22 + day * 8));
    expect(later).toMatchObject({ age_days: 8, age_band: "OVERDUE_OVER_7_DAYS", overdue: true });
    expect(deriveOverdueHandoffWatch(f.history, f.checks, f.links, f.decisions, f.resolutions, [],
      oldImport, at(22 + day * 8))[0].eligible_for_manual_handoff).toBe(true);
  });

  it("freezes overdue snapshots and preserves their source timestamps when later trials arrive", () => {
    const f = fixture();
    const evidence = record(f);
    expect(evidence[0]).toMatchObject({ age_band: "OVERDUE_3_TO_7_DAYS", age_days: 4,
      handoff_state: "PREPARED_PRIVATE_HANDOFF_NOT_SENT", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    trial(f, "issue", 22 + day * 4 + 10);
    expect(captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions,
      0, at(22 + day * 4))).toMatchObject({ newest_trial_index: null });
    expect(captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions,
      0, at(22 + day * 4 + 12))).toMatchObject({ newest_trial_index: 2,
        reopened_comparison: "NEW_OWNER_TRIAL_UNVERIFIED" });
    expect(evidence[0].newest_trial_index).toBeNull();
    expect(parseOverdueHandoffReceipt(JSON.stringify(receipt(f, evidence, 22 + day * 4 + 12)))
      .overdue_handoffs).toEqual(evidence);
  });

  it("compares reopened issues and changed aliases against a prior unverified owner improvement", () => {
    const f = resolution(source(trial(fixture(), "passed", 30), "asset_123abc", 31));
    const first = captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions, 0, at(34));
    expect(first).toMatchObject({ prior_owner_claim: "OWNER_IMPROVEMENT_UNVERIFIED",
      resolution_index: 0, prior_trial_index: 2, reopened_comparison: "NO_TRIAL_AFTER_RESOLUTION" });
    source(trial(f, "issue", 40), "asset_456def", 41);
    const reopened = captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions, 0, at(42));
    expect(reopened).toMatchObject({ prior_owner_claim: "OWNER_IMPROVEMENT_UNVERIFIED",
      newest_trial_index: 3, newest_trial_outcome: "issue", reopened_comparison: "REOPENED_ISSUE_AFTER_RESOLUTION",
      source_alias_comparison: "ALIAS_CHANGED_RECHECK_HOLD", latest_source_check_index: 3 });
    expect(deriveOverdueHandoffWatch(f.history, f.checks, f.links, f.decisions, f.resolutions, [],
      oldImport, at(42))[0].eligible_for_manual_handoff).toBe(true);
    const saved = record(f, [], 43, "REOPENED_TRIAL_COMPARISON_REQUEST");
    expect(saved[0]).toMatchObject({ prior_owner_claim: "OWNER_IMPROVEMENT_UNVERIFIED",
      reopened_comparison: "REOPENED_ISSUE_AFTER_RESOLUTION", source_alias_comparison: "ALIAS_CHANGED_RECHECK_HOLD" });
    trial(f, "passed", 50);
    expect(captureHandoffSnapshot(f.history, f.checks, f.links, f.decisions, f.resolutions, 0, at(51))
      .reopened_comparison).toBe("REOPENED_PASS_AFTER_RESOLUTION_UNVERIFIED");
    expect(parseOverdueHandoffReceipt(JSON.stringify(receipt(f, saved, 52))).overdue_handoffs).toEqual(saved);
  });

  it("requires exact manual witnesses, current Windows context and current non-imported sources", () => {
    const f = fixture();
    const input: { decision_index: number; category: ManualHandoffCategory;
      personally_reviewed: boolean; hold_acknowledged: boolean } = {
      decision_index: 0, category: "OVERDUE_INDEPENDENT_REVIEW_REQUEST",
      personally_reviewed: false, hold_acknowledged: true };
    const base = (value: typeof input, imports = oldImport, environment = env) =>
      recordOverdueHandoff(f.history, f.checks, f.links, f.decisions, f.resolutions, [],
        environment, imports, value, at(22 + day * 4));
    expect(() => base(input)).toThrow(/Personally inspect/);
    expect(() => base({ ...input, personally_reviewed: true, hold_acknowledged: false })).toThrow(/Personally inspect/);
    expect(() => base({ ...input, personally_reviewed: true }, { ...oldImport, decisions: 1 })).toThrow(/Historical imported/);
    expect(() => base({ ...input, personally_reviewed: true }, { ...oldImport, links: 1 })).toThrow(/Historical imported/);
    expect(() => base({ ...input, personally_reviewed: true }, { ...oldImport, followups: 1 })).toThrow(/Historical imported/);
    expect(() => base({ ...input, personally_reviewed: true }, oldImport, unknown)).toThrow(/unwitnessed Windows/);
    expect(() => base({ ...input, personally_reviewed: true, category: "AUTO_DISPATCH" as never }))
      .toThrow(/fixed manual HOLD/);
    expect(() => base({ ...input, personally_reviewed: true }, oldImport, env)).not.toThrow();
    expect(() => base({ ...input, personally_reviewed: true,
      category: "REOPENED_TRIAL_COMPARISON_REQUEST" })).toThrow(/reason must match/);
    expect(() => record(f, [], 50)).toThrow(/Only an overdue/);
  });

  it("prevents exact duplicate dispatch pretenses and superseded independent decisions", () => {
    const f = fixture();
    const previous = record(f);
    expect(() => record(f, previous, 22 + day * 4 + 1)).toThrow(/Duplicate private handoff snapshot/);
    expect(record(f, previous, 22 + day * 8)).toHaveLength(2);
    const newestDecision = { ...f.decisions[0], reviewed_at: at(23), source_followup_index: 0 };
    f.decisions = [...f.decisions, newestDecision];
    expect(() => record(f)).toThrow(/newer independent decision supersedes/);
  });

  it("imports legacy Builds 148–155 as historical only and retains full private nested provenance", () => {
    const f = fixture();
    const handoffs = record(f);
    const encoded = JSON.stringify(receipt(f, handoffs));
    const parsed = parseOverdueHandoffReceipt(encoded);
    expect(parsed).toMatchObject({ overdue_handoffs: handoffs, resolutions: [],
      decisions: f.decisions, trial: { observations: f.history } });
    const previousReceipts = [createTrialReceipt(env, [], f.history),
      createRecurrenceResolutionReceipt(env, [], f.history, f.handoffs, f.reviews, f.checks,
        f.links, f.reassessments, f.followups, f.decisions, f.resolutions)];
    for (const legacy of previousReceipts) {
      expect(parseOverdueHandoffReceipt(JSON.stringify(legacy)).overdue_handoffs).toEqual([]);
    }
    expect(deriveOverdueHandoffWatch(f.history, f.checks, f.links, f.decisions, f.resolutions,
      handoffs, { ...oldImport, decisions: 1, handoffs: 1 }, at(22 + day * 8))[0])
      .toMatchObject({ source_imported: true, eligible_for_manual_handoff: false, existing_handoffs: 1 });
  });

  it("rejects forged closures, unknown identifiers, missing snapshot fields, time travel and nested tampering", () => {
    const f = fixture();
    const handoffs = record(f);
    const data = receipt(f, handoffs);
    const attempt = (override: Partial<OverdueHandoffReceipt>) =>
      parseOverdueHandoffReceipt(JSON.stringify({ ...data, ...override }));
    expect(() => attempt({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => attempt({ automatic_escalation: "ENABLED" as never })).toThrow(/Unsafe/);
    expect(() => attempt({ secret: "private-ip" } as never)).toThrow(/Unsafe/);
    expect(() => attempt({ recurrence: { ...data.recurrence, closure: "GREEN" as never } })).toThrow(/Unsafe/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], device_ip: "192.168.68.10" }] as never })).toThrow(/Unsafe/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], handoff_state: "SENT" }] as never })).toThrow(/Unsafe/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], personally_reviewed: false }] as never })).toThrow(/Unsafe/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], age_days: 0 }] })).toThrow(/snapshot contradicts/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], decision_at: at(1) }] })).toThrow(/snapshot contradicts/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], newest_trial_index: 0 }] })).toThrow(/snapshot contradicts/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], captured_at: at(10) }] })).toThrow(/exact past/);
    expect(() => attempt({ overdue_handoffs: [{ ...handoffs[0], captured_at: at(22 + day * 6) }] }))
      .toThrow(/chronological order/);
    expect(() => attempt({ overdue_handoffs: [handoffs[0], handoffs[0]] })).toThrow(/Duplicate/);
    expect(() => attempt({ overdue_handoffs: Array(161).fill(handoffs[0]) })).toThrow(/exceed 160/);
    expect(() => parseOverdueHandoffReceipt("x".repeat(1_200_001))).toThrow(/exceeds 1.2 MB/);
  });
});
