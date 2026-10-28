import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { DispositionFollowupReceipt, DispositionFollowupNote } from "./ownerRecurrenceDispositionFollowup";
import { compareHeldDispositionReassessments, compareHeldDispositionReceipts,
  createHeldDispositionReceipt, parseHeldDispositionReceipt,
  recordHeldDispositionReassessment, validateHeldDispositionReassessments } from "./ownerHeldDispositionReassessment";

vi.mock("./ownerRecurrenceDispositionFollowup", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerRecurrenceDispositionFollowup")>(),
  parseDispositionFollowupReceipt: vi.fn((raw: string) => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-09-20T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-09T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", captured_at: "2026-09-20T08:00:00Z", safe_alias: "device_alpha",
        identity_state: "confirmed_alias", installed_version: "0.0.7", access: "local_console" },
      { case_id: "cameras", captured_at: "2026-10-10T08:00:00Z", safe_alias: "device_beta",
        identity_state: "operator_mismatch", installed_version: "0.0.8", access: "tailnet" },
    ],
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 }],
    recurrence_disposition_followups: JSON.parse(raw).recurrence_disposition_followups ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const before = { case_id: "cameras", reassignment_watch_index: 0,
  earlier_recurrence_index: 0, later_recurrence_index: 0,
  earlier_source_check_index: 0, later_source_check_index: 0,
  recorded_at: "2026-10-01T08:00:00Z", category: "CONTINUE_INDEPENDENT_HOLD",
  source_identity_or_access_conflict: true,
  signals: ["OWNER_REWITNESS_MISSING", "SOURCE_RECHECK_MISSING"] } as DispositionFollowupNote;
const after = { ...before, later_recurrence_index: 1, later_source_check_index: 1,
  recorded_at: "2026-10-12T08:00:00Z", category: "REQUEST_SOURCE_REVALIDATION" } as DispositionFollowupNote;
const prior = { kind: "rosevear_independent_recurrence_disposition_followup",
  exported_at: "2026-10-13T08:00:00Z", recurrence_disposition_followups: [before, after],
  exception_receipt: { exception_recurrences: [
    { latest_outcome_index: 0 }, { latest_outcome_index: 1 },
  ], drift_outcome_receipt: { drift_outcomes: [
    { latest_recheck_index: 0 }, { latest_recheck_index: 1 },
  ], renewal_receipt: { renewal_rechecks: [
    { latest_followup_index: 0 }, { latest_followup_index: 1 },
  ] } } } } as DispositionFollowupReceipt;
const env: TrialEnvironment = { installed_version: "0.0.8-build173",
  access: "local_console", installed_windows_witnessed: true };
const at = "2026-11-11T08:00:00Z";
const input = { earlier_followup_index: 0, later_followup_index: 1,
  category: "CONTINUE_INDEPENDENT_HOLD" as const,
  personally_rechecked: true, separate_hold_acknowledged: true };

describe("Build 174 held disposition reassessment", () => {
  it("keeps fresh owner/source claims and identity drift unverified under independent HOLD", () => {
    const result = compareHeldDispositionReassessments(prior, 0, 1, at);
    expect(result).toMatchObject({ newer_owner_witness_claim: true,
      newer_source_check_claim: true, repeated_owner_gap: true,
      repeated_source_gap: true, identity_conflict_unresolved: true,
      age_band: "OVER_SEVEN_DAYS", independent_reviewer_verified: false,
      closure: "NOT_AUTHORIZED" });
    expect(result.signals).toContain("CLAIMED_LATER_OWNER_SOURCE_UNVERIFIED");
    expect(result.signals).toContain("SOURCE_OVERDUE");
    const unchanged = { ...prior, recurrence_disposition_followups: [before,
      { ...after, later_source_check_index: 0 }] };
    expect(compareHeldDispositionReassessments(unchanged, 0, 1, at).signals)
      .toContain("SOURCE_CONTINUITY_GAP");
  });

  it("rejects imported later follow-ups, absent Windows witnesses and missing second attestation", () => {
    expect(() => recordHeldDispositionReassessment(prior, [], env,
      { followups: 2, reassessments: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordHeldDispositionReassessment(prior, [],
      { ...env, installed_windows_witnessed: false },
      { followups: 0, reassessments: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordHeldDispositionReassessment(prior, [], env,
      { followups: 0, reassessments: 0 },
      { ...input, separate_hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordHeldDispositionReassessment(prior, [], env,
      { followups: 0, reassessments: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_HELD_DISPOSITION_REASSESSMENT_NOT_SENT",
      independent_reviewer_verified: false, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    validateHeldDispositionReassessments(prior, notes);
    expect(() => validateHeldDispositionReassessments(prior,
      [{ ...notes[0], newer_source_check_claim: false }])).toThrow(/immutable/);
    expect(() => validateHeldDispositionReassessments(prior,
      [{ ...notes[0], closure: "APPROVED" as never }])).toThrow(/immutable/);
    expect(() => validateHeldDispositionReassessments(prior, [...notes, notes[0]]))
      .toThrow(/Duplicate/);
    const receipt = createHeldDispositionReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(parseHeldDispositionReceipt(JSON.stringify(receipt)).held_disposition_reassessments)
      .toHaveLength(1);
    expect(() => parseHeldDispositionReceipt(JSON.stringify({ ...receipt,
      owner_authorization: "GIVEN" }))).toThrow(/Unsafe Build 174/);
  });

  it("requires chronological same-watch follow-ups and exact immutable nested historical prefixes", () => {
    expect(() => compareHeldDispositionReassessments(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareHeldDispositionReassessments({ ...prior,
      recurrence_disposition_followups: [before, { ...after, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareHeldDispositionReassessments(prior, 0, 1,
      "2026-10-10T08:00:00Z")).toThrow(/chronological/);
    const earlier = JSON.stringify({ ...prior, exported_at: "2026-10-12T08:00:00Z",
      recurrence_disposition_followups: [before] });
    const later = JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z" });
    expect(compareHeldDispositionReceipts(earlier, later))
      .toMatchObject({ previous_followups: 1, current_followups: 2, new_followups: 1 });
    expect(() => compareHeldDispositionReceipts(earlier, JSON.stringify({ ...prior,
      exported_at: "2026-11-12T08:00:00Z", recurrence_disposition_followups:
      [{ ...before, case_id: "home" }, after] }))).toThrow(/historical prefix/);
  });
});
