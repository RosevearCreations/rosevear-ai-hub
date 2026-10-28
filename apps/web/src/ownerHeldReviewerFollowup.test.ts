import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { HeldReassessmentReceipt, HeldReassessmentNote } from "./ownerHeldDispositionReassessment";
import { compareHeldReviewerFollowups, compareHeldReviewerReceipts,
  createHeldReviewerReceipt, parseHeldReviewerReceipt,
  recordHeldReviewerFollowup, validateHeldReviewerFollowups } from "./ownerHeldReviewerFollowup";

vi.mock("./ownerHeldDispositionReassessment", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerHeldDispositionReassessment")>(),
  parseHeldDispositionReceipt: vi.fn((raw: string) => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-10-01T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-22T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", captured_at: "2026-10-01T08:00:00Z",
        safe_alias: "device_alpha", identity_state: "confirmed_alias",
        installed_version: "0.0.7", access: "local_console" },
      { case_id: "cameras", captured_at: "2026-10-23T08:00:00Z",
        safe_alias: "device_beta", identity_state: "operator_mismatch",
        installed_version: "0.0.8", access: "tailnet" },
    ],
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 }],
    held_disposition_reassessments: JSON.parse(raw).held_disposition_reassessments ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const before = { case_id: "cameras", reassignment_watch_index: 0,
  later_followup_index: 1, recorded_at: "2026-10-12T08:00:00Z",
  identity_conflict_unresolved: true,
  signals: ["OWNER_CONTINUITY_GAP", "SOURCE_CONTINUITY_GAP"] } as HeldReassessmentNote;
const after = { ...before, later_followup_index: 2,
  recorded_at: "2026-10-24T08:00:00Z" } as HeldReassessmentNote;
const prior = { kind: "rosevear_held_disposition_source_recheck_reassessment",
  exported_at: "2026-10-25T08:00:00Z", held_disposition_reassessments: [before, after],
  disposition_receipt: { recurrence_disposition_followups: [
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: null,
      later_recurrence_index: 0 },
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 0,
      later_recurrence_index: 0 },
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 1,
      later_recurrence_index: 1 },
  ], exception_receipt: { exception_recurrences: [
    { latest_outcome_index: 0 }, { latest_outcome_index: 1 },
  ], drift_outcome_receipt: { drift_outcomes: [
    { latest_recheck_index: 0 }, { latest_recheck_index: 1 },
  ], renewal_receipt: { renewal_rechecks: [
    { latest_followup_index: 0 }, { latest_followup_index: 1 },
  ] } } } } } as HeldReassessmentReceipt;
const environment: TrialEnvironment = { installed_version: "0.0.8-build174",
  access: "local_console", installed_windows_witnessed: true };
const at = "2026-11-11T08:00:00Z";
const input = { earlier_reassessment_index: 0, later_reassessment_index: 1,
  category: "CONTINUE_INDEPENDENT_HOLD" as const,
  owner_evidence_rechecked: true, independent_hold_acknowledged: true };

describe("Build 175 independent reviewer follow-up", () => {
  it("detects later owner/source claims but preserves identity and independent-review HOLD", () => {
    const c = compareHeldReviewerFollowups(prior, 0, 1, at);
    expect(c).toMatchObject({ later_owner_claim: true, later_distinct_source_claim: true,
      repeated_owner_gap: true, repeated_source_gap: true, source_identity_conflict: true,
      age_band: "OVER_SEVEN_DAYS", independent_reviewer_verified: false,
      closure: "NOT_AUTHORIZED" });
    expect(c.signals).toContain("LATER_CLAIM_UNVERIFIED");
    expect(c.signals).toContain("OVERDUE_SOURCE_RENEWAL");
    const stale = { ...prior, disposition_receipt: { ...prior.disposition_receipt,
      recurrence_disposition_followups: prior.disposition_receipt.recurrence_disposition_followups
        .map((item, i) => i === 2 ? { ...item, later_source_check_index: 0 } : item) } };
    expect(compareHeldReviewerFollowups(stale, 0, 1, at).signals)
      .toContain("LATER_SOURCE_CLAIM_MISSING");
  });
  it("requires non-imported later reassessment, installed witness and two HOLD confirmations", () => {
    expect(() => recordHeldReviewerFollowup(prior, [], environment,
      { reassessments: 2, followups: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordHeldReviewerFollowup(prior, [],
      { ...environment, installed_windows_witnessed: false },
      { reassessments: 0, followups: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordHeldReviewerFollowup(prior, [], environment,
      { reassessments: 0, followups: 0 },
      { ...input, independent_hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordHeldReviewerFollowup(prior, [], environment,
      { reassessments: 0, followups: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_HELD_REVIEWER_FOLLOWUP_NOT_SENT",
      independent_reviewer_verified: false, independent_review: "INDEPENDENT_REVIEW_HOLD",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    validateHeldReviewerFollowups(prior, notes);
    expect(() => validateHeldReviewerFollowups(prior,
      [{ ...notes[0], later_owner_claim: false }])).toThrow(/immutable/);
    expect(() => validateHeldReviewerFollowups(prior,
      [{ ...notes[0], closure: "APPROVED" as never }])).toThrow(/immutable/);
    expect(() => validateHeldReviewerFollowups(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
    const receipt = createHeldReviewerReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(parseHeldReviewerReceipt(JSON.stringify(receipt)).reviewer_followups).toHaveLength(1);
    expect(() => parseHeldReviewerReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 175/);
  });
  it("requires chronological held evidence and exact older Build 174 nested history", () => {
    expect(() => compareHeldReviewerFollowups(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareHeldReviewerFollowups({ ...prior,
      held_disposition_reassessments: [before, { ...after, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareHeldReviewerFollowups(prior, 0, 1,
      "2026-10-18T08:00:00Z")).toThrow(/chronological/);
    const earlier = JSON.stringify({ ...prior, exported_at: "2026-10-24T08:00:00Z",
      held_disposition_reassessments: [before] });
    const later = JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z" });
    expect(compareHeldReviewerReceipts(earlier, later))
      .toMatchObject({ previous_reassessments: 1, current_reassessments: 2,
        new_reassessments: 1 });
    expect(() => compareHeldReviewerReceipts(earlier, JSON.stringify({ ...prior,
      exported_at: "2026-11-12T08:00:00Z",
      held_disposition_reassessments: [{ ...before, case_id: "home" }, after] })))
      .toThrow(/historical prefix/);
  });
});
