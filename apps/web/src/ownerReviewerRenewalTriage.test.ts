import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { ReviewerFollowupReceipt, ReviewerFollowupNote } from "./ownerHeldReviewerFollowup";
import { compareReviewerRenewalTriage, compareReviewerRenewalReceipts,
  createReviewerRenewalReceipt, parseReviewerRenewalReceipt, PRIVATE_RUNNER_TRIAGE,
  recordReviewerRenewalTriage, validateReviewerRenewalTriage } from "./ownerReviewerRenewalTriage";

vi.mock("./ownerHeldReviewerFollowup", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerHeldReviewerFollowup")>(),
  parseHeldReviewerReceipt: vi.fn((raw: string) => ({
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
    reviewer_followups: JSON.parse(raw).reviewer_followups ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const before = { case_id: "cameras", reassignment_watch_index: 0,
  later_reassessment_index: 1, recorded_at: "2026-10-12T08:00:00Z",
  source_identity_conflict: true,
  signals: ["LATER_OWNER_CLAIM_MISSING", "LATER_SOURCE_CLAIM_MISSING"] } as ReviewerFollowupNote;
const after = { ...before, later_reassessment_index: 2,
  recorded_at: "2026-10-24T08:00:00Z" } as ReviewerFollowupNote;
const prior = { kind: "rosevear_held_reviewer_followup_source_renewal",
  exported_at: "2026-10-25T08:00:00Z", reviewer_followups: [before, after],
  held_receipt: { held_disposition_reassessments: [
    { later_followup_index: 0 }, { later_followup_index: 1 }, { later_followup_index: 2 },
  ], disposition_receipt: { recurrence_disposition_followups: [
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
  ] } } } } } } as ReviewerFollowupReceipt;
const env: TrialEnvironment = { installed_version: "0.0.8-build175", access: "local_console",
  installed_windows_witnessed: true };
const at = "2026-11-11T08:00:00Z";
const input = { earlier_reviewer_index: 0, later_reviewer_index: 1,
  category: "CONTINUE_INDEPENDENT_HOLD" as const,
  personally_rechecked: true, separate_hold_acknowledged: true };

describe("Build 176 independent reviewer renewal and private-runner evidence triage", () => {
  it("keeps structurally new owner/source and identity drift claims on permanent HOLD", () => {
    const c = compareReviewerRenewalTriage(prior, 0, 1, at);
    expect(c).toMatchObject({ newer_owner_witness_claim: true,
      newer_distinct_source_claim: true, repeated_owner_gap: true,
      repeated_source_gap: true, source_identity_drift: true,
      age_band: "OVER_SEVEN_DAYS", private_runner_approval: "NOT_GIVEN",
      independently_witnessed: false, closure: "NOT_AUTHORIZED" });
    expect(c.signals).toContain("QL248_PIN_AND_PROOF_PENDING");
    expect(c.signals).toContain("SOURCE_RENEWAL_OVERDUE");
    expect(PRIVATE_RUNNER_TRIAGE).toHaveLength(8);
    expect(PRIVATE_RUNNER_TRIAGE.map(x => x.state)).not.toContain("APPROVED");
    const unchanged = { ...prior, held_receipt: { ...prior.held_receipt,
      disposition_receipt: { ...prior.held_receipt.disposition_receipt,
        recurrence_disposition_followups: prior.held_receipt.disposition_receipt.recurrence_disposition_followups
          .map((item, index) => index === 2 ? { ...item, later_source_check_index: 0 } : item) } } };
    expect(compareReviewerRenewalTriage(unchanged, 0, 1, at).signals)
      .toContain("NEW_SOURCE_EVIDENCE_MISSING");
  });
  it("requires fresh non-imported reviewer evidence, installed witness and independent HOLD acknowledgement", () => {
    expect(() => recordReviewerRenewalTriage(prior, [], env,
      { reviewers: 2, triages: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordReviewerRenewalTriage(prior, [],
      { ...env, installed_windows_witnessed: false },
      { reviewers: 0, triages: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordReviewerRenewalTriage(prior, [], env,
      { reviewers: 0, triages: 0 }, { ...input, separate_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    const notes = recordReviewerRenewalTriage(prior, [], env,
      { reviewers: 0, triages: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_REVIEWER_RENEWAL_TRIAGE_NOT_SENT",
      private_runner_approval: "NOT_GIVEN", independently_witnessed: false,
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", closure: "NOT_AUTHORIZED" });
    validateReviewerRenewalTriage(prior, notes);
    expect(() => validateReviewerRenewalTriage(prior,
      [{ ...notes[0], newer_distinct_source_claim: false }])).toThrow(/immutable/);
    expect(() => validateReviewerRenewalTriage(prior,
      [{ ...notes[0], private_runner_approval: "GIVEN" as never }])).toThrow(/immutable/);
    expect(() => validateReviewerRenewalTriage(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
    const receipt = createReviewerRenewalReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(parseReviewerRenewalReceipt(JSON.stringify(receipt)).renewal_triage_notes).toHaveLength(1);
    expect(() => parseReviewerRenewalReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 176/);
  });
  it("requires exact chronological same-watch reviewer history and append-only receipt prefixes", () => {
    expect(() => compareReviewerRenewalTriage(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareReviewerRenewalTriage({ ...prior,
      reviewer_followups: [before, { ...after, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareReviewerRenewalTriage(prior, 0, 1,
      "2026-10-18T08:00:00Z")).toThrow(/chronological/);
    const previous = JSON.stringify({ ...prior, exported_at: "2026-10-24T08:00:00Z",
      reviewer_followups: [before] });
    const current = JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z" });
    expect(compareReviewerRenewalReceipts(previous, current))
      .toMatchObject({ previous_reviewers: 1, current_reviewers: 2, new_reviewers: 1 });
    expect(() => compareReviewerRenewalReceipts(previous, JSON.stringify({ ...prior,
      exported_at: "2026-11-12T08:00:00Z",
      reviewer_followups: [{ ...before, case_id: "home" }, after] })))
      .toThrow(/historical prefix/);
  });
});
