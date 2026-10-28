import { afterAll, describe, expect, it, vi } from "vitest";
import type { ExceptionNote, ExceptionReceipt } from "./ownerOutcomeExceptionRecurrence";
import type { TrialEnvironment } from "./ownerFieldTrial";
import { compareDispositionFollowups, comparePrivateExceptionReceipts,
  createDispositionFollowupReceipt, parseDispositionFollowupReceipt,
  recordDispositionFollowup, validateDispositionFollowups } from "./ownerRecurrenceDispositionFollowup";

vi.mock("./ownerOutcomeExceptionRecurrence", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerOutcomeExceptionRecurrence")>(),
  parseExceptionReceipt: vi.fn((raw: string) => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-09-20T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-08T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", captured_at: "2026-09-20T08:00:00Z",
        safe_alias: "device_alpha", identity_state: "confirmed_alias",
        installed_version: "0.0.7-build171", access: "local_console" },
      { case_id: "cameras", captured_at: "2026-10-09T08:00:00Z",
        safe_alias: "device_beta", identity_state: "operator_mismatch",
        installed_version: "0.0.8-build172", access: "tailnet" },
    ],
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 }],
    exception_recurrences: JSON.parse(raw).exception_recurrences ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const before = { case_id: "cameras", reassignment_watch_index: 0,
  latest_outcome_index: 0, latest_recheck_index: 0, latest_source_check_index: 0,
  recorded_at: "2026-10-01T08:00:00Z", category: "REQUEST_OWNER_FRESHNESS_RECHECK",
  version_or_access_conflict: true, repeated_identity_drift: true,
  signals: ["OWNER_CONTINUITY_NOT_FRESH", "REPEATED_SOURCE_RENEWAL_GAP"] } as ExceptionNote;
const after = { ...before, latest_outcome_index: 1, latest_recheck_index: 1,
  latest_source_check_index: 1, recorded_at: "2026-10-12T08:00:00Z",
  category: "REQUEST_RECURRING_SOURCE_REVIEW" } as ExceptionNote;
const prior = { kind: "rosevear_independent_recheck_outcome_exception_recurrence",
  exported_at: "2026-10-13T08:00:00Z", exception_recurrences: [before, after],
  drift_outcome_receipt: { drift_outcomes: [
    { latest_recheck_index: 0 }, { latest_recheck_index: 1 },
  ], renewal_receipt: { renewal_rechecks: [
    { latest_followup_index: 0 }, { latest_followup_index: 1 },
  ] } } } as ExceptionReceipt;
const env: TrialEnvironment = { installed_version: "0.0.8-build172",
  access: "local_console", installed_windows_witnessed: true };
const at = "2026-11-11T08:00:00Z";

describe("Build 173 independent recurrence disposition follow-up", () => {
  it("distinguishes structurally later owner/source claims from independent proof", () => {
    const result = compareDispositionFollowups(prior, 0, 1, at);
    expect(result).toMatchObject({ newer_witnessed_owner_claim: true,
      newer_distinct_source_claim: true, source_identity_or_access_conflict: true,
      repeated_owner_gap: true, repeated_source_gap: true,
      age_band: "OVER_SEVEN_DAYS", independently_verified: false, unresolved: true });
    expect(result.signals).toContain("CLAIMED_LATER_OWNER_AND_SOURCE_UNVERIFIED");
    expect(result.signals).toContain("REPEATED_OVERDUE_SOURCE");
    expect(result.signals).toContain("INDEPENDENT_HOLD_CONTINUES");
    const stale = { ...prior, exception_recurrences: [before,
      { ...after, latest_source_check_index: 0 }] };
    expect(compareDispositionFollowups(stale, 0, 1, at).signals)
      .toContain("SOURCE_RECHECK_MISSING");
  });

  it("requires a non-imported later recurrence and two separate manual HOLD confirmations", () => {
    const input = { earlier_recurrence_index: 0, later_recurrence_index: 1,
      category: "REQUEST_SOURCE_REVALIDATION" as const,
      personally_rechecked: true, independent_hold_acknowledged: true };
    expect(() => recordDispositionFollowup(prior, [], env,
      { recurrences: 2, followups: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordDispositionFollowup(prior, [],
      { ...env, installed_windows_witnessed: false },
      { recurrences: 0, followups: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordDispositionFollowup(prior, [], env,
      { recurrences: 0, followups: 0 },
      { ...input, independent_hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordDispositionFollowup(prior, [], env,
      { recurrences: 0, followups: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_RECURRENCE_DISPOSITION_FOLLOWUP_NOT_SENT",
      independently_verified: false, field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    validateDispositionFollowups(prior, notes);
    expect(() => validateDispositionFollowups(prior,
      [{ ...notes[0], newer_distinct_source_claim: false }])).toThrow(/immutable/);
    expect(() => validateDispositionFollowups(prior,
      [{ ...notes[0], closure: "APPROVED" as never }])).toThrow(/HOLD/);
    expect(() => validateDispositionFollowups(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
    expect(() => recordDispositionFollowup(prior, [], env,
      { recurrences: 0, followups: 0 },
      { ...input, category: "REQUEST_OVERDUE_REVIEW" }, at)).not.toThrow();
  });

  it("rejects backwards and cross-case dispositions, forged approval and unsafe imports", () => {
    expect(() => compareDispositionFollowups(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareDispositionFollowups({ ...prior,
      exception_recurrences: [before, { ...after, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same held watch/);
    expect(() => compareDispositionFollowups(prior, 0, 1, "2026-10-10T08:00:00Z"))
      .toThrow(/chronological/);
    const notes = recordDispositionFollowup(prior, [], env,
      { recurrences: 0, followups: 0 },
      { earlier_recurrence_index: 0, later_recurrence_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_rechecked: true,
        independent_hold_acknowledged: true }, at);
    const receipt = createDispositionFollowupReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(() => parseDispositionFollowupReceipt(JSON.stringify({ ...receipt, closure: "APPROVED" })))
      .toThrow(/Unsafe Build 173/);
    expect(() => parseDispositionFollowupReceipt(JSON.stringify({ ...receipt,
      recurrence_disposition_followups: [{ ...notes[0], signals: [] }] }))).toThrow(/immutable/);
  });

  it("strictly compares complete Build 172 nested append-only historical receipts", () => {
    const beforeRaw = JSON.stringify({ ...prior, exception_recurrences: [before] });
    const afterRaw = JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z",
      exception_recurrences: [before, after] });
    expect(comparePrivateExceptionReceipts(beforeRaw, afterRaw))
      .toMatchObject({ previous_recurrences: 1, current_recurrences: 2, new_recurrences: 1 });
    expect(() => comparePrivateExceptionReceipts(beforeRaw,
      JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z",
        exception_recurrences: [{ ...before, case_id: "home" }, after] })))
      .toThrow(/historical prefix/);
  });
});
