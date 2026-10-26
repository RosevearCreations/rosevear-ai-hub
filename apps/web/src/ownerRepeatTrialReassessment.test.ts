import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment, type TrialObservation } from "./ownerFieldTrial";
import { advanceRepairHandoff, createReconciliationReceipt, createRepairHandoff } from "./ownerTrialReconciliation";
import { REVIEW_CRITERIA, createIndependentReviewReceipt, recordIndependentEvidence, type ReviewEvidenceEvent } from "./ownerIndependentReview";
import { createFieldRoutingReceipt, recordSourceIdentityCheck, type SourceIdentityCheck } from "./ownerFieldRouting";
import { assessHoldReassessment, compareReviewerEvidence, createReassessmentReceipt, parseReassessmentReceipt,
  recordHoldReassessment, recordRepeatTrialLink, repeatTrialCandidates, type IndependentHoldReassessment,
  type RepeatTrialEvidenceLink } from "./ownerRepeatTrialReassessment";

const env: TrialEnvironment = { installed_version: "0.0.6-build152", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const time = (minute: number) => new Date(Date.parse("2026-10-25T12:00:00Z") + minute * 60_000).toISOString();
const issue = (history: TrialObservation[], at: number) => recordTrialObservation(history, unknown,
  { case_id: "cameras", outcome: "issue", finding: "playback_missing", next_owner: "camera_operator", witnessed: true }, time(at));
const pass = (history: TrialObservation[], at: number) => recordTrialObservation(history, env,
  { case_id: "cameras", outcome: "passed", finding: "none", next_owner: "household_owner", witnessed: true }, time(at));
const check = (history: TrialObservation[], checks: SourceIdentityCheck[], at: number,
  alias = "asset_123abc", state: "confirmed_alias" | "operator_mismatch" | "identity_unknown" = "confirmed_alias") =>
  recordSourceIdentityCheck(history, checks, env, { case_id: "cameras", identity_state: state, safe_alias: alias,
    personally_witnessed: true }, time(at));
const imported = { trials: 0, checks: 0, reviews: 0, links: 0 };

function fixture() {
  let history = issue([], 0);
  let handoffs = createRepairHandoff(history, [], "cameras", time(1));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(2));
  handoffs = advanceRepairHandoff(history, handoffs, "cameras", 0, true, time(3));
  let checks = check(history, [], 4);
  history = pass(history, 5);
  checks = check(history, checks, 6);
  return { history, handoffs, checks };
}

function linked() {
  const { history, checks, handoffs } = fixture();
  const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], imported,
    { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
  return { history, checks, handoffs, links };
}

function reviewed(history: TrialObservation[], handoffs: ReturnType<typeof fixture>["handoffs"]) {
  let reviews: ReviewEvidenceEvent[] = [];
  for (const [index, criterion] of REVIEW_CRITERIA.entries()) {
    reviews = recordIndependentEvidence(history, handoffs, reviews, env, { case_id: "cameras", baseline_index: 0,
      criterion: criterion.id, state: "present_claimed", reviewer_witnessed: true,
      separate_reviewer: criterion.id === "independent_witness" }, time(8 + index));
  }
  return reviews;
}

describe("Build 152 exact repeat-trial evidence links and independent HOLD reassessment", () => {
  it("requires the latest freshly witnessed retest and a real previous route reason", () => {
    const { history, checks, handoffs } = fixture();
    const candidates = repeatTrialCandidates(history, checks, env, handoffs, [], imported);
    expect(candidates.find(item => item.case_id === "cameras")).toMatchObject({ baseline_index: 0, retest_index: 1,
      source_check_index: 0, reasons: expect.arrayContaining(["ACTIVE_FINDING"]) });
    const links = recordRepeatTrialLink(history, checks, [], env, handoffs, [], imported,
      { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7));
    expect(links[0]).toMatchObject({ case_id: "cameras", baseline_trial_index: 0, retest_trial_index: 1,
      source_alias: "asset_123abc", installed_version: "0.0.6-build152", witnessed_on_windows: true });
    expect(() => recordRepeatTrialLink(history, checks, links, env, handoffs, [], imported,
      { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(8))).toThrow(/Duplicate exact/);
    expect(() => recordRepeatTrialLink(history, checks, [], env, handoffs, [], imported,
      { case_id: "cameras", route_reason: "REOPENED_AFTER_PASS", personally_witnessed: true }, time(7))).toThrow(/actual historical/);
    expect(() => recordRepeatTrialLink(history, checks, [], unknown, handoffs, [], imported,
      { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: true }, time(7))).toThrow(/Personally witness/);
    expect(() => recordRepeatTrialLink(history, checks, [], env, handoffs, [], imported,
      { case_id: "cameras", route_reason: "ACTIVE_FINDING", personally_witnessed: false }, time(7))).toThrow(/Personally witness/);
  });

  it("does not link imported-only trials and keeps old reviewer claims distinct from fresh ones", () => {
    const { history, checks, handoffs } = fixture();
    expect(repeatTrialCandidates(history, checks, env, handoffs, [], { ...imported, trials: history.length })).toEqual([]);
    const { links } = linked();
    const reviews = reviewed(history, handoffs);
    expect(compareReviewerEvidence(history, reviews, handoffs, links[0]).every(item =>
      item.historical === "missing" && item.fresh === "present_claimed" && !item.requires_fresh_review)).toBe(true);
    expect(compareReviewerEvidence(history, reviews, handoffs, links[0], reviews.length).every(item =>
      item.fresh === "imported_historical" && item.requires_fresh_review)).toBe(true);
    expect(assessHoldReassessment(history, checks, links, 0, env, handoffs, reviews,
      { ...imported, links: links.length }).packet_status).toBe("INDEPENDENT_HOLD_REASSESSMENT_REQUIRED");
  });

  it("compares all seven criteria and prepares only a private, unverified independent packet", () => {
    const { history, checks, handoffs, links } = linked();
    const empty = assessHoldReassessment(history, checks, links, 0, env, handoffs, [], imported);
    expect(empty).toMatchObject({ packet_status: "INDEPENDENT_HOLD_REASSESSMENT_REQUIRED",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    expect(empty.comparison).toHaveLength(7);
    expect(() => recordHoldReassessment(history, checks, links, [], env, handoffs, [], imported,
      { link_index: 0, mark: "packet_prepared_only", reviewer_witnessed: true, separate_reviewer: true }, time(16)))
      .toThrow(/cannot be prepared/);
    const reviews = reviewed(history, handoffs);
    const ready = assessHoldReassessment(history, checks, links, 0, env, handoffs, reviews, imported);
    expect(ready).toMatchObject({ packet_status: "REVIEW_PACKET_PREPARED_ONLY", blockers: [],
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    expect(() => recordHoldReassessment(history, checks, links, [], env, handoffs, reviews, imported,
      { link_index: 0, mark: "packet_prepared_only", reviewer_witnessed: true, separate_reviewer: false }, time(16)))
      .toThrow(/cannot be prepared/);
    const entries = recordHoldReassessment(history, checks, links, [], env, handoffs, reviews, imported,
      { link_index: 0, mark: "packet_prepared_only", reviewer_witnessed: true, separate_reviewer: true }, time(16));
    expect(entries[0]).toMatchObject({ closure: "NOT_AUTHORIZED", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      separate_reviewer_attested: true });
  });

  it("reopens hold after later observations, changed Windows, same-trial identity conflict or reviewer contradiction", () => {
    const { history, checks, handoffs, links } = linked();
    const reviews = reviewed(history, handoffs);
    const changed = { ...env, installed_version: "0.0.7-build152" };
    expect(assessHoldReassessment(history, checks, links, 0, changed, handoffs, reviews, imported).blockers)
      .toEqual(expect.arrayContaining([expect.stringMatching(/changed installed Windows/)]));
    const newHistory = issue(history, 20);
    expect(assessHoldReassessment(newHistory, checks, links, 0, env, handoffs, reviews, imported).blockers)
      .toEqual(expect.arrayContaining([expect.stringMatching(/newer trial/)]));
    const mismatch = check(history, checks, 17, "asset_123abc", "operator_mismatch");
    const restored = check(history, mismatch, 18);
    expect(assessHoldReassessment(history, restored, links, 0, env, handoffs, reviews, imported).blockers)
      .toEqual(expect.arrayContaining([expect.stringMatching(/identity contradiction/)]));
    const contradiction = recordIndependentEvidence(history, handoffs, reviews, env,
      { case_id: "cameras", baseline_index: 0, criterion: "identity_match", state: "contradiction",
        reviewer_witnessed: true, separate_reviewer: false }, time(17));
    const rechecked = recordIndependentEvidence(history, handoffs, contradiction, env,
      { case_id: "cameras", baseline_index: 0, criterion: "identity_match", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, time(18));
    expect(assessHoldReassessment(history, checks, links, 0, env, handoffs, rechecked, imported).blockers)
      .toEqual(expect.arrayContaining([expect.stringMatching(/contradictory reviewer mark/)]));
  });

  it("round-trips a bounded, nested, immutable-HOLD receipt and imports all legacy receipts as historical", () => {
    const { history, checks, handoffs, links } = linked();
    const reviews = reviewed(history, handoffs);
    const entries = recordHoldReassessment(history, checks, links, [], env, handoffs, reviews, imported,
      { link_index: 0, mark: "packet_prepared_only", reviewer_witnessed: true, separate_reviewer: true }, time(16));
    const receipt = createReassessmentReceipt(env, [], history, handoffs, reviews, checks, links, entries, time(19));
    expect(receipt).toMatchObject({ field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED", automatic_dispatch: "DISABLED", evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS" });
    expect(parseReassessmentReceipt(JSON.stringify(receipt))).toMatchObject({ trial: receipt.source_routing.independent_review.reconciliation.trial,
      links, reassessments: entries, checks });
    const legacy = [createTrialReceipt(env, [], history, time(19)),
      createReconciliationReceipt(env, [], history, handoffs, time(19)),
      createIndependentReviewReceipt(env, [], history, handoffs, reviews, time(19)),
      createFieldRoutingReceipt(env, [], history, handoffs, reviews, checks, time(19))];
    for (const old of legacy) expect(parseReassessmentReceipt(JSON.stringify(old))).toMatchObject({ links: [], reassessments: [] });
  });

  it("rejects forged closure, host fields, mismatched case pointers, alias edits and timeline tampering without replacing state", () => {
    const { history, checks, handoffs, links } = linked();
    const reviews = reviewed(history, handoffs);
    const notes: IndependentHoldReassessment[] = recordHoldReassessment(history, checks, links, [], env, handoffs, reviews, imported,
      { link_index: 0, mark: "reviewer_gaps_hold", reviewer_witnessed: true, separate_reviewer: false }, time(16));
    const receipt = createReassessmentReceipt(env, [], history, handoffs, reviews, checks, links, notes, time(19));
    const parse = (update: Partial<typeof receipt>) => parseReassessmentReceipt(JSON.stringify({ ...receipt, ...update }));
    expect(() => parse({ closure: "GREEN" as never })).toThrow(/Unsafe/);
    expect(() => parse({ source_routing: receipt.source_routing.independent_review as never })).toThrow(/complete validated Build 151/);
    expect(() => parse({ trial_links: [{ ...links[0], hostname: "PRIVATE-HOST" }] as never })).toThrow(/unsafe repeat-trial/);
    expect(() => parse({ trial_links: [{ ...links[0], source_alias: "asset_998877" }] })).toThrow(/alias does not match/);
    expect(() => parse({ trial_links: [{ ...links[0], retest_trial_index: 404 }] })).toThrow(/chronology/);
    expect(() => parse({ trial_links: [{ ...links[0], case_id: "mqtt" }] as RepeatTrialEvidenceLink[] })).toThrow(/chronology/);
    expect(() => parse({ trial_links: [{ ...links[0], installed_version: "C:\\secrets" }] })).toThrow(/Version must/);
    expect(() => parse({ reassessments: [{ ...notes[0], closure: "GREEN" }] as never })).toThrow(/unsafe independent/);
    expect(() => parse({ reassessments: [{ ...notes[0], mark: "packet_prepared_only", separate_reviewer_attested: true }],
      source_routing: { ...receipt.source_routing,
        independent_review: { ...receipt.source_routing.independent_review, review_events: [] } } }))
      .toThrow(/chronological, non-contradictory/);
    expect(() => parse({ reassessments: [{ ...notes[0], link_index: 5 }] })).toThrow(/stale source linkage/);
    expect(() => parse({ reassessments: [{ ...notes[0], reviewer_password: "should-not-import" }] as never })).toThrow(/unsafe independent/);
    expect(() => parse({ reassessments: [null] as never })).toThrow(/unsafe independent/);
  });
});
