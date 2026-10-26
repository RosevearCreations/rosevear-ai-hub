import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { createDecisionReplayReceipt, recordFollowupDecision } from "./ownerFollowupDecisionReplay";
import { createRecurrenceResolutionReceipt, deriveRecurrenceWatch, parseRecurrenceResolutionReceipt,
  recordRecurrenceResolution, type RecurrenceResolutionEvidence, type RecurrenceResolutionReceipt } from "./ownerRecurrenceResolution";

const env: TrialEnvironment = { installed_version: "0.0.6-build155", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-15T08:00:00Z") + minute * 60_000).toISOString();
const none = { trials: 0, checks: 0, decisions: 0, resolutions: 0 };
const lower = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(0));
  let handoffs = createRepairHandoff(history, [], "cameras", time(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(3));
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(4));
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, time(5));
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras",
    identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(6));
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], lower,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs, [], [],
    lower, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
  const decisions = recordFollowupDecision(history, checks, links, followups, [], env, handoffs,
    [], [], lower, { source_followup_index: 0, decision: "REPEAT_TRIAL_REQUESTED",
      personally_reviewed: true, separate_reviewer: true }, time(22));
  return { history, checks, links, followups, decisions, handoffs, reviews: [], reassessments: [] };
}
type Fixture = ReturnType<typeof fixture>;
function watch(f: Fixture, evidence: RecurrenceResolutionEvidence[] = [], imports = none, at = 60) {
  return deriveRecurrenceWatch(f.history, f.checks, f.links, f.decisions, evidence, imports, time(at));
}
function repeat(f: Fixture, outcome: "passed" | "issue" = "issue", at = 30) {
  f.history = recordTrialObservation(f.history, env, { case_id: "cameras", outcome,
    finding: outcome === "passed" ? "none" : "playback_missing",
    next_owner: "camera_operator", witnessed: true }, time(at));
  return f;
}
function record(f: Fixture, old: RecurrenceResolutionEvidence[] = [], at = 32,
  input = { decision_index: 0, trial_index: f.history.length - 1, personally_witnessed: true, hold_acknowledged: true },
  imports = none, environment = env) {
  return recordRecurrenceResolution(f.history, f.checks, f.links, f.decisions, old, environment,
    imports, input, time(at));
}

describe("Build 155 independent recurrence resolution and overdue decision watch", () => {
  it("keeps an unchanged decision open, with advisory age anchored to its original reviewer time", () => {
    const f = fixture();
    const [recent] = watch(f, [], none, 60);
    expect(recent).toMatchObject({ decision_index: 0, age_band: "RECENT_UNDER_24H", age_days: 0,
      overdue: false, state: "WAITING_FOR_NEW_OWNER_TRIAL", newest_trial_index: null,
      evidence_index: null, original_linked_at: time(7), decision_at: time(22),
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    const [aged] = watch(f, [], none, 22 + 4 * 1440);
    expect(aged).toMatchObject({ age_band: "OVERDUE_3_TO_7_DAYS", age_days: 4,
      overdue: true, state: "WAITING_FOR_NEW_OWNER_TRIAL" });
    const [veryAged] = watch(f, [], none, 22 + 8 * 1440);
    expect(veryAged.age_band).toBe("OVERDUE_OVER_7_DAYS");
  });

  it("links a newer owner issue to its exact private decision and never authorizes resolution", () => {
    const f = repeat(fixture());
    expect(watch(f)[0]).toMatchObject({ newest_trial_index: 2, newest_trial_at: time(30),
      state: "NEW_TRIAL_NEEDS_MANUAL_INTAKE", source_comparison: "NO_NEW_SOURCE_WITNESS" });
    const resolution = record(f);
    expect(resolution[0]).toMatchObject({ decision_index: 0, trial_index: 2,
      decision_at: time(22), trial_at: time(30), source_linked_at: time(7),
      resolution_claim: "RECURRING_ISSUE_REPORTED", source_check_index: null,
      resolution_state: "OWNER_RECURRENCE_EVIDENCE_UNVERIFIED_HOLD", closure: "NOT_AUTHORIZED" });
    expect(watch(f, resolution)[0]).toMatchObject({ state: "OWNER_EVIDENCE_NEEDS_INDEPENDENT_REVIEW",
      claim: "RECURRING_ISSUE_REPORTED", evidence_index: 0 });
    expect(() => record(f, resolution, 33)).toThrow(/superseded evidence cannot be re-used/);
  });

  it("labels even a newer witnessed pass and matching source alias as unverified owner evidence", () => {
    const f = repeat(fixture(), "passed");
    f.checks = recordSourceIdentityCheck(f.history, f.checks, env, { case_id: "cameras",
      identity_state: "confirmed_alias", safe_alias: "asset_123abc", personally_witnessed: true }, time(31));
    expect(watch(f)[0].source_comparison).toBe("ALIAS_MATCH_UNVERIFIED");
    const result = record(f);
    expect(result[0]).toMatchObject({ resolution_claim: "OWNER_IMPROVEMENT_UNVERIFIED",
      source_comparison: "ALIAS_MATCH_UNVERIFIED", source_check_index: 2,
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    expect(watch(f, result)[0].state).toBe("OWNER_EVIDENCE_NEEDS_INDEPENDENT_REVIEW");
  });

  it("refuses imported decisions or trials, absent Windows witnessing, bad attestations and obsolete trials", () => {
    const f = repeat(fixture());
    expect(() => record(f, [], 32, { decision_index: 0, trial_index: 2,
      personally_witnessed: false, hold_acknowledged: true })).toThrow(/Personally witness/);
    expect(() => record(f, [], 32, { decision_index: 0, trial_index: 2,
      personally_witnessed: true, hold_acknowledged: false })).toThrow(/Personally witness/);
    expect(() => record(f, [], 32, undefined, { ...none, decisions: 1 })).toThrow(/Historical\/imported/);
    expect(() => record(f, [], 32, undefined, { ...none, trials: 3 })).toThrow(/Historical\/imported/);
    expect(() => record(f, [], 32, undefined, none, unknown)).toThrow(/unverified Windows/);
    expect(() => record(f, [], 32, { decision_index: 0, trial_index: 1,
      personally_witnessed: true, hold_acknowledged: true })).toThrow(/newest exact post-decision/);
    f.history = recordTrialObservation(f.history, env, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(33));
    expect(() => record(f, [], 34, { decision_index: 0, trial_index: 2,
      personally_witnessed: true, hold_acknowledged: true })).toThrow(/newest exact post-decision/);
  });

  it("preserves later trial reopens without mutating original accepted owner intake evidence", () => {
    const f = repeat(fixture(), "passed");
    const evidence = record(f);
    f.history = recordTrialObservation(f.history, env, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(34));
    const row = watch(f, evidence, none, 36)[0];
    expect(row).toMatchObject({ state: "NEWER_TRIAL_REQUIRES_FRESH_DECISION", claim: "OWNER_IMPROVEMENT_UNVERIFIED",
      newest_trial_index: 3, original_linked_at: time(7), closure: "NOT_AUTHORIZED" });
    expect(evidence[0].trial_at).toBe(time(30));
    expect(() => record(f, evidence, 37)).toThrow(/superseded evidence cannot be re-used/);
  });

  it("does not let imported historical claims appear freshly eligible in the manual watch", () => {
    const f = repeat(fixture());
    expect(watch(f, [], { ...none, decisions: 1 })[0]).toMatchObject({ source_imported: true,
      state: "HISTORICAL_REWITNESS_HOLD" });
    expect(watch(f, [], { ...none, trials: 3 })[0].state).toBe("HISTORICAL_REWITNESS_HOLD");
    const proof = record(f);
    expect(watch(f, proof, { ...none, resolutions: 1 })[0].state).toBe("HISTORICAL_REWITNESS_HOLD");
  });

  it("round-trips the whole Build 155 private receipt and imports Builds 148–154 as history only", () => {
    const f = repeat(fixture(), "passed");
    const resolutions = record(f);
    const receipt = createRecurrenceResolutionReceipt(env, [], f.history, f.handoffs, f.reviews,
      f.checks, f.links, f.reassessments, f.followups, f.decisions, resolutions, time(33));
    expect(receipt).toMatchObject({ kind: "rosevear_independent_recurrence_resolution_watch",
      scheduled_watch: "DISABLED", automatic_dispatch: "DISABLED", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    expect(parseRecurrenceResolutionReceipt(JSON.stringify(receipt))).toMatchObject({ resolutions,
      decisions: f.decisions, trial: { observations: f.history } });
    const old = [createTrialReceipt(env, [], f.history, time(33)),
      createDecisionReplayReceipt(env, [], f.history, f.handoffs, f.reviews, f.checks,
        f.links, f.reassessments, f.followups, f.decisions, time(33))];
    for (const previous of old) {
      expect(parseRecurrenceResolutionReceipt(JSON.stringify(previous)).resolutions).toEqual([]);
    }
  });

  it("rejects forged approvals, unknown fields, cross-case pointers, changed outcomes and malformed chronology", () => {
    const f = repeat(fixture(), "passed");
    const resolutions = record(f);
    const receipt = createRecurrenceResolutionReceipt(env, [], f.history, f.handoffs, f.reviews,
      f.checks, f.links, f.reassessments, f.followups, f.decisions, resolutions, time(33));
    const parse = (patch: Partial<RecurrenceResolutionReceipt>) =>
      parseRecurrenceResolutionReceipt(JSON.stringify({ ...receipt, ...patch }));
    expect(() => parse({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => parse({ scheduled_watch: "ACTIVE" as never })).toThrow(/Unsafe/);
    expect(() => parse({ secret: "http://private-server" } as never)).toThrow(/Unsafe/);
    expect(() => parse({ replay: { ...receipt.replay, closure: "GREEN" } as never })).toThrow(/Unsafe/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], ip: "192.168.68.2" }] as never })).toThrow(/Unsafe/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], closure: "GREEN" }] as never })).toThrow(/Unsafe/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], personally_witnessed: false }] as never })).toThrow(/Unsafe/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], case_id: "mqtt" }] as never })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], trial_index: 0 }] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], outcome_at_intake: "issue" }] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], trial_at: time(1) }] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], recorded_at: time(29) }] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [{ ...resolutions[0], recorded_at: time(40) }] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: [resolutions[0], resolutions[0]] })).toThrow(/conflicting decision/);
    expect(() => parse({ resolutions: Array(201).fill(resolutions[0]) })).toThrow(/exceeds 200/);
    expect(() => parseRecurrenceResolutionReceipt("x".repeat(1_050_001))).toThrow(/exceeds 1.05 MB/);
  });
});
