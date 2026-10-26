import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { recordIndependentEvidence } from "./ownerIndependentReview";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { createFollowupReceipt, recordOwnerEvidenceFollowup } from "./ownerReassessmentFollowup";
import { createDecisionReplayReceipt, deriveFollowupDecisionReplay, parseDecisionReplayReceipt,
  recordFollowupDecision, type DecisionReplayReceipt, type FollowupDecision } from "./ownerFollowupDecisionReplay";

const env: TrialEnvironment = { installed_version: "0.0.6-build154", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-24T08:00:00Z") + minute * 60_000).toISOString();
const imported = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0, followups: 0, decisions: 0 };

function fixture() {
  let history = recordTrialObservation([], unknown, { case_id: "cameras", outcome: "issue",
    finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(0));
  let handoffs = createRepairHandoff(history, [], "cameras", time(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(3));
  let checks = recordSourceIdentityCheck(history, [], env, { case_id: "cameras", identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", personally_witnessed: true }, time(4));
  history = recordTrialObservation(history, env, { case_id: "cameras", outcome: "passed", finding: "none",
    next_owner: "household_owner", witnessed: true }, time(5));
  checks = recordSourceIdentityCheck(history, checks, env, { case_id: "cameras", identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", personally_witnessed: true }, time(6));
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], imported,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
  const reviews: ReturnType<typeof recordIndependentEvidence> = [];
  const reassessments: [] = [];
  const followups = recordOwnerEvidenceFollowup(history, checks, links, [], env, handoffs,
    reviews, reassessments, imported, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
  return { history, checks, links, handoffs, reviews, reassessments, followups };
}
type Fixture = ReturnType<typeof fixture>;
function replay(f: Fixture, decisions: FollowupDecision[] = [], options: typeof imported = imported,
  environment = env) {
  return deriveFollowupDecisionReplay(f.history, f.checks, f.links, f.followups, decisions,
    environment, f.handoffs, f.reviews, f.reassessments, options, time(60));
}
function decide(f: Fixture, source: number, old: FollowupDecision[] = [],
  options: typeof imported = imported, at = 22) {
  return recordFollowupDecision(f.history, f.checks, f.links, f.followups, old, env, f.handoffs,
    f.reviews, f.reassessments, options, { source_followup_index: source,
      decision: "INDEPENDENT_FIELD_HOLD_REVIEW", personally_reviewed: true, separate_reviewer: true }, time(at));
}

describe("Build 154 exact follow-up replay and recurrence oversight", () => {
  it("shows the first owner note and unconditional physical hold without a claimed independent review", () => {
    const f = fixture();
    const rows = replay(f);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ link_index: 0, criterion: "field_hold", owner_notes: 1, decisions: 0,
      source_followup_index: 0, first_linked_at: time(7), first_owner_note_at: time(19),
      latest_decision: null, review_priority: "MANUAL_REVIEW_HOLD", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      closure: "NOT_AUTHORIZED" });
    expect(rows[0].recurrence).toEqual([]);
  });

  it("preserves repeated owner notes and independent replay counts, with no automatic closure", () => {
    const f = fixture();
    const firstDecision = decide(f, 0, [], imported, 20);
    f.followups = recordOwnerEvidenceFollowup(f.history, f.checks, f.links, f.followups, env,
      f.handoffs, f.reviews, f.reassessments, imported,
      { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(21));
    const both = decide(f, 1, firstDecision, imported, 22);
    const [row] = replay(f, both);
    expect(row).toMatchObject({ owner_notes: 2, decisions: 2, latest_owner_note_at: time(21),
      review_priority: "RECURRING_HOLD_RECHECK", current_status: "PACKET_UNVERIFIED_HOLD" });
    expect(row.recurrence).toEqual(expect.arrayContaining(["REPEATED_OWNER_FOLLOWUP", "REPEATED_REVIEW_DECISION"]));
    expect(row.closure).toBe("NOT_AUTHORIZED");
    expect(() => decide(f, 1, both, imported, 23)).toThrow(/already been reviewed/);
    expect(() => decide(f, 0, [], imported, 23)).toThrow(/already been reviewed/);
  });

  it("flags source mismatches, reviewer contradictions and superseded trials without hiding their original evidence", () => {
    const f = fixture();
    f.checks = recordSourceIdentityCheck(f.history, f.checks, env, { case_id: "cameras",
      identity_state: "operator_mismatch", safe_alias: "asset_123abc", personally_witnessed: true }, time(24));
    f.reviews = recordIndependentEvidence(f.history, f.handoffs, [], env, { case_id: "cameras", baseline_index: 0,
      criterion: "identity_match", state: "contradiction", reviewer_witnessed: true, separate_reviewer: false }, time(25));
    f.history = recordTrialObservation(f.history, unknown, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(26));
    const [row] = replay(f);
    expect(row.recurrence).toEqual(expect.arrayContaining(["SOURCE_IDENTITY_RECURRENCE",
      "REVIEWER_CONTRADICTION", "SUPERSEDED_TRIAL", "EVIDENCE_STATUS_CHANGED"]));
    expect(row.suggested_action).toBe("REPEAT_TRIAL_REQUESTED");
    expect(row.historical_status).toBe("PACKET_UNVERIFIED_HOLD");
    expect(row.current_status).toBe("RETEST_SUPERSEDED");
    expect(row.closure).toBe("NOT_AUTHORIZED");
  });

  it("treats imported links and notes as historical and refuses to review them as fresh", () => {
    const f = fixture();
    const options = { ...imported, followups: 1, links: 1 };
    const [row] = replay(f, [], options, unknown);
    expect(row).toMatchObject({ source_imported: true, review_priority: "HISTORICAL_REWITNESS_REQUIRED" });
    expect(row.recurrence).toEqual(expect.arrayContaining(["IMPORTED_HISTORY", "WINDOWS_RECHECK"]));
    expect(() => decide(f, 0, [], options)).toThrow(/Imported notes or unverified/);
    expect(() => recordFollowupDecision(f.history, f.checks, f.links, f.followups, [], unknown,
      f.handoffs, f.reviews, f.reassessments, imported, { source_followup_index: 0,
        decision: "OWNER_NOTE_REQUIRED", personally_reviewed: true, separate_reviewer: true }, time(22)))
      .toThrow(/unverified installed Windows/);
  });

  it("labels imported current-looking reviewer evidence as historical even with a freshly recorded owner note", () => {
    const f = fixture();
    f.reviews = recordIndependentEvidence(f.history, f.handoffs, [], env, { case_id: "cameras",
      baseline_index: 0, criterion: "identity_match", state: "present_claimed",
      reviewer_witnessed: true, separate_reviewer: false }, time(25));
    const [row] = replay(f, [], { ...imported, reviews: 1 });
    expect(row.source_imported).toBe(true);
    expect(row.recurrence).toContain("IMPORTED_HISTORY");
    expect(row.review_priority).toBe("HISTORICAL_REWITNESS_REQUIRED");
  });

  it("requires separate reviewer attestation and exact fresh owner note, with immutable HOLD-only choices", () => {
    const f = fixture();
    const input = { source_followup_index: 0, decision: "INDEPENDENT_FIELD_HOLD_REVIEW" as const,
      personally_reviewed: true, separate_reviewer: true };
    const create = (patch: Partial<typeof input>) => recordFollowupDecision(f.history, f.checks, f.links,
      f.followups, [], env, f.handoffs, f.reviews, f.reassessments, imported, { ...input, ...patch }, time(22));
    expect(() => create({ personally_reviewed: false })).toThrow(/separate reviewer/);
    expect(() => create({ separate_reviewer: false })).toThrow(/separate reviewer/);
    expect(() => create({ source_followup_index: 404 })).toThrow(/Imported notes/);
    expect(() => create({ decision: "AUTOMATIC_DISPATCH" as never })).toThrow(/fixed manual/);
    expect(create({})[0]).toMatchObject({ source_followup_index: 0, source_linked_at: time(7),
      source_followup_at: time(19), reviewer_witnessed: true, separate_reviewer_attested: true,
      review_state: "INDEPENDENT_FOLLOWUP_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
  });

  it("round-trips complete nested Build 154 receipt and imports legacy Build 148–153 without fabricated decisions", () => {
    const f = fixture();
    const decisions = decide(f, 0, [], imported, 22);
    const receipt = createDecisionReplayReceipt(env, [], f.history, f.handoffs, f.reviews,
      f.checks, f.links, f.reassessments, f.followups, decisions, time(23));
    expect(receipt).toMatchObject({ kind: "rosevear_independent_followup_decision_replay",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED" });
    expect(parseDecisionReplayReceipt(JSON.stringify(receipt))).toMatchObject({ decisions,
      followups: f.followups, links: f.links, trial: receipt.followup.reassessment.source_routing.independent_review.reconciliation.trial });
    const older = [createTrialReceipt(env, [], f.history, time(23)),
      createFollowupReceipt(env, [], f.history, f.handoffs, f.reviews, f.checks,
        f.links, f.reassessments, f.followups, time(23))];
    for (const value of older) expect(parseDecisionReplayReceipt(JSON.stringify(value)).decisions).toEqual([]);
  });

  it("rejects untrusted fields, fake approval, conflicting pointers, duplicate notes and time travel", () => {
    const f = fixture();
    const decisions = decide(f, 0, [], imported, 22);
    const receipt = createDecisionReplayReceipt(env, [], f.history, f.handoffs,
      f.reviews, f.checks, f.links, f.reassessments, f.followups, decisions, time(23));
    const parse = (patch: Partial<DecisionReplayReceipt>) => parseDecisionReplayReceipt(JSON.stringify({ ...receipt, ...patch }));
    expect(() => parse({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => parse({ followup: { ...receipt.followup, closure: "GREEN" } as never })).toThrow(/Unsafe/);
    expect(() => parse({ decisions: [{ ...decisions[0], ip: "192.168.2.20" }] as never })).toThrow(/Unsafe private/);
    expect(() => parse({ decisions: [{ ...decisions[0], closure: "GREEN" }] as never })).toThrow(/Unsafe private/);
    expect(() => parse({ decisions: [{ ...decisions[0], reviewer_witnessed: false }] as never })).toThrow(/Unsafe private/);
    expect(() => parse({ decisions: [{ ...decisions[0], source_followup_index: 777 }] })).toThrow(/exact follow-up provenance/);
    expect(() => parse({ decisions: [{ ...decisions[0], case_id: "mqtt" }] as never })).toThrow(/exact follow-up provenance/);
    expect(() => parse({ decisions: [{ ...decisions[0], reviewed_at: time(18) }] })).toThrow(/exact follow-up provenance/);
    expect(() => parse({ decisions: [{ ...decisions[0], reviewed_at: time(30) }] })).toThrow(/exact follow-up provenance/);
    expect(() => parse({ decisions: [decisions[0], decisions[0]] })).toThrow(/duplicate/);
    expect(() => parse({ decisions: Array(241).fill(decisions[0]) })).toThrow(/exceeds 240/);
    expect(() => parseDecisionReplayReceipt("a".repeat(900_001))).toThrow(/exceeds 900 KB/);
  });
});
