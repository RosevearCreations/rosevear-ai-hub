import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { ReviewerFollowupReceipt, ReviewerFollowupNote } from "./ownerHeldReviewerFollowup";
import { createReviewerRenewalReceipt, recordReviewerRenewalTriage,
  type RenewalTriageReceipt } from "./ownerReviewerRenewalTriage";
import { compareHistoricalTriageContinuity, compareTriageRenewalContinuity,
  createTriageContinuityReceipt, inspectQl248AuditDraft, parseTriageContinuityReceipt,
  recordTriageContinuity, validateTriageContinuityNotes } from "./ownerReviewerTriageContinuity";

vi.mock("./ownerHeldReviewerFollowup", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerHeldReviewerFollowup")>(),
  parseHeldReviewerReceipt: vi.fn((raw: string) => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-10-01T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-22T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-29T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", captured_at: "2026-10-01T08:00:00Z",
        safe_alias: "source_a", identity_state: "confirmed_alias",
        installed_version: "0.0.7", access: "local_console" },
      { case_id: "cameras", captured_at: "2026-10-23T08:00:00Z",
        safe_alias: "source_b", identity_state: "operator_mismatch",
        installed_version: "0.0.8", access: "tailnet" },
      { case_id: "cameras", captured_at: "2026-10-30T08:00:00Z",
        safe_alias: "source_c", identity_state: "operator_mismatch",
        installed_version: "0.0.9", access: "tailnet" },
    ],
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 },
      { latest_audit_index: 2 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 },
      { latest_observation_index: 2 }],
    reviewer_followups: JSON.parse(raw).reviewer_followups ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const reviewerA = { case_id: "cameras", reassignment_watch_index: 0,
  later_reassessment_index: 1, recorded_at: "2026-10-12T08:00:00Z",
  source_identity_conflict: true,
  signals: ["LATER_OWNER_CLAIM_MISSING", "LATER_SOURCE_CLAIM_MISSING"] } as ReviewerFollowupNote;
const reviewerB = { ...reviewerA, later_reassessment_index: 2,
  recorded_at: "2026-10-24T08:00:00Z" } as ReviewerFollowupNote;
const reviewerC = { ...reviewerA, later_reassessment_index: 3,
  recorded_at: "2026-11-01T08:00:00Z" } as ReviewerFollowupNote;
const held = { kind: "rosevear_held_reviewer_followup_source_renewal",
  exported_at: "2026-11-03T08:00:00Z", reviewer_followups: [reviewerA, reviewerB, reviewerC],
  held_receipt: { held_disposition_reassessments: [
    { later_followup_index: 0 }, { later_followup_index: 1 },
    { later_followup_index: 2 }, { later_followup_index: 3 },
  ], disposition_receipt: { recurrence_disposition_followups: [
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: null, later_recurrence_index: 0 },
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 0, later_recurrence_index: 0 },
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 1, later_recurrence_index: 1 },
    { case_id: "cameras", reassignment_watch_index: 0, later_source_check_index: 2, later_recurrence_index: 2 },
  ], exception_receipt: { exception_recurrences: [
    { latest_outcome_index: 0 }, { latest_outcome_index: 1 }, { latest_outcome_index: 2 },
  ], drift_outcome_receipt: { drift_outcomes: [
    { latest_recheck_index: 0 }, { latest_recheck_index: 1 }, { latest_recheck_index: 2 },
  ], renewal_receipt: { renewal_rechecks: [
    { latest_followup_index: 0 }, { latest_followup_index: 1 }, { latest_followup_index: 2 },
  ] } } } } } } as ReviewerFollowupReceipt;
const environment: TrialEnvironment = { installed_windows_witnessed: true,
  installed_version: "0.0.9-build176", access: "local_console" };
const firstNote = recordReviewerRenewalTriage(held, [], environment,
  { reviewers: 0, triages: 0 }, { earlier_reviewer_index: 0, later_reviewer_index: 1,
    category: "CONTINUE_INDEPENDENT_HOLD", personally_rechecked: true,
    separate_hold_acknowledged: true }, "2026-10-26T08:00:00Z")[0];
const secondNote = recordReviewerRenewalTriage(held, [firstNote], environment,
  { reviewers: 0, triages: 0 }, { earlier_reviewer_index: 1, later_reviewer_index: 2,
    category: "REQUEST_PRIVATE_RUNNER_SCOPE_REVIEW", personally_rechecked: true,
    separate_hold_acknowledged: true }, "2026-11-03T08:00:00Z")[1];
const prior: RenewalTriageReceipt = createReviewerRenewalReceipt(held,
  [firstNote, secondNote], "2026-11-04T08:00:00Z");
const at = "2026-11-11T08:00:00Z";
const input = { earlier_triage_index: 0, later_triage_index: 1,
  category: "CONTINUE_REVIEWER_TRIAGE_HOLD" as const,
  personally_rechecked: true, separate_hold_acknowledged: true };

describe("Build 177 reviewer triage continuity and QL-248 format-only audit", () => {
  it("rechecks same-watch later private triages and never elevates evidence to independent approval", () => {
    const c = compareTriageRenewalContinuity(prior, 0, 1, at);
    expect(c).toMatchObject({ newer_owner_witness_claim: true,
      newer_distinct_source_claim: true, source_identity_drift: true,
      age_band: "OVER_SEVEN_DAYS", ql248_trust: "FORMAT_ONLY_UNVERIFIED",
      independently_witnessed: false, private_runner_approval: "NOT_GIVEN",
      closure: "NOT_AUTHORIZED" });
    expect(c.signals).toContain("QL248_TWO_SHA_CONSUMER_AGREEMENT_PENDING");
    expect(c.signals).toContain("SOURCE_RECHECK_OVERDUE");
    const unchanged = { ...held, held_receipt: { ...held.held_receipt,
      disposition_receipt: { ...held.held_receipt.disposition_receipt,
        recurrence_disposition_followups: held.held_receipt.disposition_receipt.recurrence_disposition_followups
          .map((v, index) => index === 3 ? { ...v, later_source_check_index: 1 } : v) } } };
    expect(compareTriageRenewalContinuity({ ...prior, reviewer_receipt: unchanged }, 0, 1, at).signals)
      .toContain("POST_TRIAGE_SOURCE_RECHECK_MISSING");
  });
  it("demands a non-imported later triage, installed witness and independent HOLD acknowledgments", () => {
    expect(() => recordTriageContinuity(prior, [], environment,
      { triages: 2, continuity: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordTriageContinuity(prior, [],
      { ...environment, installed_windows_witnessed: false },
      { triages: 0, continuity: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordTriageContinuity(prior, [], environment,
      { triages: 0, continuity: 0 }, { ...input, separate_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    const notes = recordTriageContinuity(prior, [], environment,
      { triages: 0, continuity: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_TRIAGE_RENEWAL_CONTINUITY_NOT_SENT",
      closure: "NOT_AUTHORIZED", ql248_trust: "FORMAT_ONLY_UNVERIFIED" });
    validateTriageContinuityNotes(prior, notes);
    expect(() => validateTriageContinuityNotes(prior,
      [{ ...notes[0], newer_owner_witness_claim: false }])).toThrow(/immutable/);
    expect(() => validateTriageContinuityNotes(prior,
      [{ ...notes[0], private_runner_approval: "GIVEN" as never }])).toThrow(/immutable/);
    expect(() => validateTriageContinuityNotes(prior, [notes[0], notes[0]])).toThrow(/Duplicate/);
    const receipt = createTriageContinuityReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(parseTriageContinuityReceipt(JSON.stringify(receipt)).triage_continuity_notes).toHaveLength(1);
    expect(() => parseTriageContinuityReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 177/);
    expect(() => parseTriageContinuityReceipt(JSON.stringify({ ...receipt,
      triage_receipt: { ...prior, private_runner_approval: "GIVEN" } }))).toThrow(/Unsafe Build 176/);
  });
  it("rejects changed historical source records and nonprogressive triage pairs", () => {
    expect(() => compareTriageRenewalContinuity(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareTriageRenewalContinuity({ ...prior,
      renewal_triage_notes: [firstNote, { ...secondNote, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareTriageRenewalContinuity(prior, 0, 1,
      "2026-11-01T08:00:00Z")).toThrow(/chronological/);
    const earlier = { ...prior, exported_at: "2026-11-03T08:00:00Z",
      renewal_triage_notes: [firstNote] };
    expect(compareHistoricalTriageContinuity(JSON.stringify(earlier), JSON.stringify(prior)))
      .toMatchObject({ previous_triages: 1, current_triages: 2, new_triages: 1 });
    expect(() => compareHistoricalTriageContinuity(JSON.stringify(earlier),
      JSON.stringify({ ...prior, renewal_triage_notes: [{ ...firstNote,
        case_id: "home" }, secondNote] }))).toThrow();
  });
  it("checks public-only QL-248 identifier formats without authentication or approval", () => {
    const data = { repository: "RosevearCreations/rosevear-ai-hub",
      source_sha: "a".repeat(40), proof_commit_sha: "b".repeat(40),
      source_ci_url: "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40739817937",
      raw_proof_sha256: "c".repeat(64), public_spki_sha256: "d".repeat(64) };
    const r = inspectQl248AuditDraft(data);
    expect(r).toMatchObject({ format_complete: true, source_proof_separate: true,
      status: "UNVERIFIED_NOT_AUTHORIZED", consumer_agreement: "PENDING",
      external_retrieval: "NOT_PERFORMED", public_key_pin: "NOT_AUTHENTICATED",
      authenticated_get: "NOT_PERFORMED", seven_denials: "UNVERIFIED",
      owner_pilot_authorization: "NOT_GIVEN" });
    expect(inspectQl248AuditDraft({ ...data, proof_commit_sha: data.source_sha }).format_complete).toBe(false);
    expect(inspectQl248AuditDraft({ ...data, source_ci_url: "https://evil.example/actions/runs/1" }).format_complete).toBe(false);
    expect(inspectQl248AuditDraft({ ...data, raw_proof_sha256: "key-secret" }).format_complete).toBe(false);
  });
});
