import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { advanceRepairHandoff, createRepairHandoff } from "./ownerTrialReconciliation";
import { REVIEW_CRITERIA, recordIndependentEvidence } from "./ownerIndependentReview";
import { recordSourceIdentityCheck } from "./ownerFieldRouting";
import { createReassessmentReceipt, recordHoldReassessment, recordRepeatTrialLink } from "./ownerRepeatTrialReassessment";
import { createFollowupReceipt, deriveReassessmentExceptionQueue, parseFollowupReceipt,
  recordOwnerEvidenceFollowup, type FollowupReceipt } from "./ownerReassessmentFollowup";

const env: TrialEnvironment = { installed_version: "0.0.6-build153", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-22T12:00:00Z") + minute * 60_000).toISOString();
const imported = { trials: 0, checks: 0, reviews: 0, links: 0, reassessments: 0 };
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
  return { history, handoffs, checks, links };
}
function sevenReviews(f: ReturnType<typeof fixture>) {
  let reviews: ReturnType<typeof recordIndependentEvidence> = [];
  for (const [index, criterion] of REVIEW_CRITERIA.entries()) {
    reviews = recordIndependentEvidence(f.history, f.handoffs, reviews, env, {
      case_id: "cameras", baseline_index: 0, criterion: criterion.id, state: "present_claimed",
      reviewer_witnessed: true, separate_reviewer: criterion.id === "independent_witness" }, time(8 + index));
  }
  return reviews;
}
const queue = (f: ReturnType<typeof fixture>, reviews = sevenReviews(f),
  reassessments: ReturnType<typeof recordHoldReassessment> = [], importedState = imported,
  now = time(18), history: TrialObservation[] = f.history) =>
  deriveReassessmentExceptionQueue(history, f.checks, f.links, env, f.handoffs, reviews,
    reassessments, importedState, now);

describe("Build 153 owner exception aging and bounded follow-up", () => {
  it("keeps mandatory physical hold even if all seven current reviewer criteria are present", () => {
    const f = fixture();
    expect(queue(f)).toMatchObject([{ field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" }]);
    expect(queue(f)).toHaveLength(1);
    expect(queue(f)[0]).toMatchObject({ case_id: "cameras", criterion: "field_hold", status: "PACKET_UNVERIFIED_HOLD",
      first_linked_at: time(7), original_observed_at: time(0), retest_observed_at: time(5),
      age_band: "RECENT_UNDER_24H", age_days: 0 });
    expect(queue(f, [], [], imported, time(18))).toHaveLength(REVIEW_CRITERIA.length + 1);
    expect(queue(f, [], [], imported, time(18)).filter(item => item.criterion !== "field_hold")
      .every(item => item.status === "MISSING_CURRENT_EVIDENCE")).toBe(true);
  });

  it("distinguishes linked-at age from original issue, imported fresh-looking claims and reviewer contradiction", () => {
    const f = fixture();
    const old = queue(f, sevenReviews(f), [], imported, time(7 + 4 * 24 * 60));
    expect(old[0].age_band).toBe("AGED_OVER_3_DAYS");
    expect(old[0].age_days).toBe(4);
    const imp = queue(f, sevenReviews(f), [], { ...imported, reviews: 7, links: 1 });
    expect(imp.find(item => item.criterion === "identity_match")?.status).toBe("IMPORTED_REVIEW_CLAIM");
    expect(imp.find(item => item.criterion === "field_hold")?.status).toBe("IMPORTED_LINK_HOLD");
    const reviews = recordIndependentEvidence(f.history, f.handoffs, sevenReviews(f), env,
      { case_id: "cameras", baseline_index: 0, criterion: "identity_match", state: "contradiction",
        reviewer_witnessed: true, separate_reviewer: false }, time(18));
    const after = queue(f, reviews, [], imported, time(19));
    expect(after.find(item => item.criterion === "identity_match")?.status).toBe("REVIEWER_CONTRADICTION");
  });

  it("reopens a previously prepared-only packet after a new issue and never clears HOLD", () => {
    const f = fixture();
    const reviews = sevenReviews(f);
    const notes = recordHoldReassessment(f.history, f.checks, f.links, [], env, f.handoffs, reviews, imported,
      { link_index: 0, mark: "packet_prepared_only", reviewer_witnessed: true, separate_reviewer: true }, time(16));
    const later = recordTrialObservation(f.history, unknown, { case_id: "cameras", outcome: "issue",
      finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(17));
    const results = queue(f, reviews, notes, imported, time(18), later);
    expect(results.find(item => item.criterion === "field_hold")?.status).toBe("REOPENED_AFTER_PACKET");
    expect(results.every(item => item.closure === "NOT_AUTHORIZED")).toBe(true);
  });

  it("requires a manually selected exact active exception and records only a fixed OPEN/HOLD role and action", () => {
    const f = fixture();
    const reviews = sevenReviews(f);
    const entry = { link_index: 0, criterion: "field_hold" as const, personally_reviewed: true };
    const create = (input: { link_index: number; criterion: "field_hold" | "identity_match"; personally_reviewed: boolean } = entry,
      prior: ReturnType<typeof recordOwnerEvidenceFollowup> = []) =>
      recordOwnerEvidenceFollowup(f.history, f.checks, f.links, prior, env, f.handoffs,
        reviews, [], imported, input, time(19));
    expect(() => create({ ...entry, personally_reviewed: false })).toThrow(/Review the exact/);
    expect(() => create({ link_index: 4, criterion: "field_hold", personally_reviewed: true }))
      .toThrow(/no longer matches/);
    expect(() => create({ ...entry, criterion: "identity_match" }))
      .toThrow(/no longer matches/);
    const notes = create();
    expect(notes[0]).toMatchObject({ case_id: "cameras", source_linked_at: time(7),
      next_owner: "camera_operator", personally_reviewed: true, followup_state: "OPEN_MANUAL_HOLD",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    expect(create(entry, notes)).toHaveLength(2);
  });

  it("round-trips bounded complete receipts and imports Builds 148–152 as historical only", () => {
    const f = fixture();
    const reviews = sevenReviews(f);
    const notes = recordOwnerEvidenceFollowup(f.history, f.checks, f.links, [], env, f.handoffs,
      reviews, [], imported, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
    const receipt = createFollowupReceipt(env, [], f.history, f.handoffs, reviews, f.checks, f.links, [], notes, time(20));
    expect(receipt).toMatchObject({ kind: "rosevear_independent_reassessment_followup",
      automatic_dispatch: "DISABLED", independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    expect(parseFollowupReceipt(JSON.stringify(receipt))).toMatchObject({
      followups: notes, links: f.links, checks: f.checks, trial: receipt.reassessment.source_routing.independent_review.reconciliation.trial });
    const old = [createTrialReceipt(env, [], f.history, time(20)),
      createReassessmentReceipt(env, [], f.history, f.handoffs, reviews, f.checks, f.links, [], time(20))];
    for (const prior of old) expect(parseFollowupReceipt(JSON.stringify(prior)).followups).toEqual([]);
  });

  it("rejects fake GREEN, arbitrary host fields, invalid pointers, times and forged owner attestation", () => {
    const f = fixture();
    const reviews = sevenReviews(f);
    const notes = recordOwnerEvidenceFollowup(f.history, f.checks, f.links, [], env, f.handoffs,
      reviews, [], imported, { link_index: 0, criterion: "field_hold", personally_reviewed: true }, time(19));
    const receipt = createFollowupReceipt(env, [], f.history, f.handoffs, reviews, f.checks, f.links, [], notes, time(20));
    const parse = (change: Partial<FollowupReceipt>) => parseFollowupReceipt(JSON.stringify({ ...receipt, ...change }));
    expect(() => parse({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => parse({ reassessment: { ...receipt.reassessment, closure: "GREEN" } as never })).toThrow(/Unsafe/);
    expect(() => parse({ followups: [{ ...notes[0], hostname: "private-home-pc" }] as never })).toThrow(/Invalid or sensitive/);
    expect(() => parse({ followups: [{ ...notes[0], personally_reviewed: false }] as never })).toThrow(/Invalid or sensitive/);
    expect(() => parse({ followups: [{ ...notes[0], closure: "GREEN" }] as never })).toThrow(/Invalid or sensitive/);
    expect(() => parse({ followups: [{ ...notes[0], link_index: 999 }] })).toThrow(/exact source link/);
    expect(() => parse({ followups: [{ ...notes[0], source_linked_at: time(8) }] })).toThrow(/exact source link/);
    expect(() => parse({ followups: [{ ...notes[0], reviewed_at: time(21) }] })).toThrow(/exact source link/);
    expect(() => parse({ followups: Array(241).fill(notes[0]) })).toThrow(/exceeds 240/);
    expect(() => parseFollowupReceipt("a".repeat(700_001))).toThrow(/exceeds 700 KB/);
  });
});
