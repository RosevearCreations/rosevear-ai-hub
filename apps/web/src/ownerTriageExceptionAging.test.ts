import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { ReviewerFollowupReceipt, ReviewerFollowupNote } from "./ownerHeldReviewerFollowup";
import { createReviewerRenewalReceipt, recordReviewerRenewalTriage } from "./ownerReviewerRenewalTriage";
import { createTriageContinuityReceipt, recordTriageContinuity,
  type TriageContinuityReceipt } from "./ownerReviewerTriageContinuity";
import { compareHistoricalTriageExceptions, compareTriageExceptionAging,
  createTriageExceptionReceipt, parseTriageExceptionReceipt, recordTriageException,
  validateTriageExceptionNotes } from "./ownerTriageExceptionAging";

vi.mock("./ownerHeldReviewerFollowup", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerHeldReviewerFollowup")>(),
  parseHeldReviewerReceipt: vi.fn(() => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-10-01T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-22T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-29T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-11-11T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", captured_at: "2026-10-01T08:00:00Z",
        safe_alias: "alias_a", identity_state: "confirmed_alias", installed_version: "0.0.7", access: "local_console" },
      { case_id: "cameras", captured_at: "2026-10-23T08:00:00Z",
        safe_alias: "alias_b", identity_state: "operator_mismatch", installed_version: "0.0.8", access: "tailnet" },
      { case_id: "cameras", captured_at: "2026-10-30T08:00:00Z",
        safe_alias: "alias_c", identity_state: "operator_mismatch", installed_version: "0.0.9", access: "tailnet" },
      { case_id: "cameras", captured_at: "2026-11-10T08:00:00Z",
        safe_alias: "alias_d", identity_state: "operator_mismatch", installed_version: "0.0.10", access: "tailnet" },
    ],
    aging_followups: [0, 1, 2, 3].map(i => ({ latest_audit_index: i })),
    aging_audits: [0, 1, 2, 3].map(i => ({ latest_observation_index: i })),
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-28T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const reviewerA = { case_id: "cameras", reassignment_watch_index: 0,
  later_reassessment_index: 1, recorded_at: "2026-10-12T08:00:00Z",
  source_identity_conflict: true,
  signals: ["LATER_OWNER_CLAIM_MISSING", "LATER_SOURCE_CLAIM_MISSING"] } as ReviewerFollowupNote;
const reviewerB = { ...reviewerA, later_reassessment_index: 2,
  recorded_at: "2026-10-24T08:00:00Z" } as ReviewerFollowupNote;
const reviewerC = { ...reviewerA, later_reassessment_index: 3,
  recorded_at: "2026-11-01T08:00:00Z" } as ReviewerFollowupNote;
const reviewerD = { ...reviewerA, later_reassessment_index: 4,
  recorded_at: "2026-11-12T08:00:00Z" } as ReviewerFollowupNote;
const held = { kind: "rosevear_held_reviewer_followup_source_renewal",
  exported_at: "2026-11-12T10:00:00Z", reviewer_followups: [reviewerA, reviewerB, reviewerC, reviewerD],
  held_receipt: { held_disposition_reassessments: [0, 1, 2, 3, 4].map(i => ({ later_followup_index: i })),
    disposition_receipt: { recurrence_disposition_followups: [
      { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: null, later_recurrence_index: 0 },
      { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 0, later_recurrence_index: 0 },
      { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 1, later_recurrence_index: 1 },
      { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 2, later_recurrence_index: 2 },
      { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 3, later_recurrence_index: 3 },
    ], exception_receipt: { exception_recurrences: [0, 1, 2, 3].map(i => ({ latest_outcome_index: i })),
      drift_outcome_receipt: { drift_outcomes: [0, 1, 2, 3].map(i => ({ latest_recheck_index: i })),
        renewal_receipt: { renewal_rechecks: [0, 1, 2, 3].map(i => ({ latest_followup_index: i })) } } } } } } as ReviewerFollowupReceipt;
const environment: TrialEnvironment = { installed_version: "0.0.10-build177",
  installed_windows_witnessed: true, access: "local_console" };
const t0 = recordReviewerRenewalTriage(held, [], environment, { reviewers: 0, triages: 0 },
  { earlier_reviewer_index: 0, later_reviewer_index: 1, category: "CONTINUE_INDEPENDENT_HOLD",
    personally_rechecked: true, separate_hold_acknowledged: true }, "2026-10-26T08:00:00Z")[0];
const t1 = recordReviewerRenewalTriage(held, [t0], environment, { reviewers: 0, triages: 0 },
  { earlier_reviewer_index: 1, later_reviewer_index: 2, category: "CONTINUE_INDEPENDENT_HOLD",
    personally_rechecked: true, separate_hold_acknowledged: true }, "2026-11-03T08:00:00Z")[1];
const t2 = recordReviewerRenewalTriage(held, [t0, t1], environment, { reviewers: 0, triages: 0 },
  { earlier_reviewer_index: 2, later_reviewer_index: 3, category: "CONTINUE_INDEPENDENT_HOLD",
    personally_rechecked: true, separate_hold_acknowledged: true }, "2026-11-12T08:00:00Z")[2];
const reviewerReceipt = createReviewerRenewalReceipt(held, [t0, t1, t2], "2026-11-13T08:00:00Z");
const c0 = recordTriageContinuity(reviewerReceipt, [], environment, { triages: 0, continuity: 0 },
  { earlier_triage_index: 0, later_triage_index: 1, category: "CONTINUE_REVIEWER_TRIAGE_HOLD",
    personally_rechecked: true, separate_hold_acknowledged: true }, "2026-11-04T08:00:00Z")[0];
const c1 = recordTriageContinuity(reviewerReceipt, [c0], environment, { triages: 0, continuity: 0 },
  { earlier_triage_index: 1, later_triage_index: 2, category: "CONTINUE_REVIEWER_TRIAGE_HOLD",
    personally_rechecked: true, separate_hold_acknowledged: true }, "2026-11-13T08:00:00Z")[1];
const prior: TriageContinuityReceipt = createTriageContinuityReceipt(reviewerReceipt,
  [c0, c1], "2026-11-14T08:00:00Z");
const at = "2026-11-26T08:00:00Z";
const input = { earlier_continuity_index: 0, later_continuity_index: 1,
  category: "KEEP_INDEPENDENT_HOLD" as const,
  personally_rechecked: true, separate_hold_acknowledged: true };

describe("Build 178 private triage exception aging", () => {
  it("recomputes post-prior-continuity claimed source/owner, drift and overdue exceptions without authorization", () => {
    const c = compareTriageExceptionAging(prior, 0, 1, at);
    expect(c).toMatchObject({ later_owner_witness_claim: true,
      later_distinct_source_claim: true, source_identity_drift: true,
      age_band: "OVER_SEVEN_DAYS", source_provenance: "UNVERIFIED",
      private_runner: "NOT_AUTHORIZED", independent_reviewer: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    expect(c.signals).toContain("QL248_SOURCE_PROOF_PROVENANCE_UNVERIFIED");
    expect(c.signals).toContain("SOURCE_CHECK_OVERDUE");
    const modified = { ...held, held_receipt: { ...held.held_receipt,
      disposition_receipt: { ...held.held_receipt.disposition_receipt,
        recurrence_disposition_followups: held.held_receipt.disposition_receipt.recurrence_disposition_followups
          .map((v, i) => i === 4 ? { ...v, later_source_check_index: 2 } : v) } } };
    expect(compareTriageExceptionAging({ ...prior, triage_receipt: {
      ...reviewerReceipt, reviewer_receipt: modified } }, 0, 1, at).signals)
      .toContain("POST_CONTINUITY_SOURCE_MISSING");
  });
  it("refuses imported later continuity, unwitnessed Windows or missing separate HOLD attestations", () => {
    expect(() => recordTriageException(prior, [], environment,
      { continuity: 2, exceptions: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordTriageException(prior, [],
      { ...environment, installed_windows_witnessed: false },
      { continuity: 0, exceptions: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordTriageException(prior, [], environment,
      { continuity: 0, exceptions: 0 }, { ...input, separate_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    const notes = recordTriageException(prior, [], environment,
      { continuity: 0, exceptions: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_TRIAGE_EXCEPTION_FOLLOWUP_NOT_SENT",
      closure: "NOT_AUTHORIZED", source_provenance: "UNVERIFIED" });
    validateTriageExceptionNotes(prior, notes);
    expect(() => validateTriageExceptionNotes(prior,
      [{ ...notes[0], later_owner_witness_claim: false }])).toThrow(/immutable/);
    expect(() => validateTriageExceptionNotes(prior,
      [{ ...notes[0], private_runner: "AUTHORIZED" as never }])).toThrow(/immutable/);
    expect(() => validateTriageExceptionNotes(prior, [notes[0], notes[0]])).toThrow(/Duplicate/);
    const receipt = createTriageExceptionReceipt(prior, notes, "2026-11-27T08:00:00Z");
    expect(parseTriageExceptionReceipt(JSON.stringify(receipt)).triage_exception_notes).toHaveLength(1);
    expect(() => parseTriageExceptionReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 178/);
    expect(() => parseTriageExceptionReceipt(JSON.stringify({ ...receipt,
      continuity_receipt: { ...prior, source_provenance: "VERIFIED" } }))).toThrow(/Unsafe Build 177/);
  });
  it("requires chronological same-watch pairs and strict append-only Build 177 history", () => {
    expect(() => compareTriageExceptionAging(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareTriageExceptionAging({ ...prior,
      triage_continuity_notes: [c0, { ...c1, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareTriageExceptionAging(prior, 0, 1,
      "2026-11-10T08:00:00Z")).toThrow(/chronological/);
    const earlier = { ...prior, exported_at: "2026-11-13T08:00:00Z",
      triage_continuity_notes: [c0] };
    expect(compareHistoricalTriageExceptions(JSON.stringify(earlier), JSON.stringify(prior)))
      .toMatchObject({ previous_continuity: 1, current_continuity: 2, new_continuity: 1 });
    expect(() => compareHistoricalTriageExceptions(JSON.stringify(earlier), JSON.stringify({
      ...prior, triage_continuity_notes: [{ ...c0, case_id: "home" }, c1],
    }))).toThrow();
  });
});
