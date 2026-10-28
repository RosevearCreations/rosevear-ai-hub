import { afterAll, describe, expect, it, vi } from "vitest";
import type { DriftOutcomeReceipt, DriftOutcomeNote } from "./ownerSourceDriftOutcome";
import type { TrialEnvironment } from "./ownerFieldTrial";
import { compareOutcomeExceptions, comparePrivateDriftOutcomeReceipts,
  createExceptionReceipt, parseExceptionReceipt, recordExceptionRecurrence,
  validateExceptionRecurrences } from "./ownerOutcomeExceptionRecurrence";

vi.mock("./ownerSourceDriftOutcome", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerSourceDriftOutcome")>(),
  parseDriftOutcomeReceipt: vi.fn((raw: string) => ({
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-09-20T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-03T08:00:00Z", witnessed_by_operator: true },
    ] },
    checks: [
      { case_id: "cameras", trial_index: 0, safe_alias: "asset_a", identity_state: "confirmed_alias",
        installed_version: "0.0.7-build171", access: "local_console",
        captured_at: "2026-09-20T08:00:00Z" },
      { case_id: "cameras", trial_index: 1, safe_alias: "asset_b", identity_state: "operator_mismatch",
        installed_version: "0.0.8-build171", access: "tailnet",
        captured_at: "2026-10-03T08:00:00Z" },
    ],
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 }],
    drift_outcomes: JSON.parse(raw).drift_outcomes ?? [],
  })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const before = { case_id: "cameras", reassignment_watch_index: 0,
  latest_recheck_index: 0, latest_source_check_index: 0,
  recorded_at: "2026-10-01T08:00:00Z", category: "REQUEST_OWNER_CONTINUITY_WITNESS",
  owner_witness_continuity: false, source_renewed_after_prior_recheck: false,
  identity_or_access_drift_continues: true, signals: ["SOURCE_DRIFT_UNRESOLVED"] } as DriftOutcomeNote;
const after = { ...before, latest_recheck_index: 1, latest_source_check_index: 1,
  recorded_at: "2026-10-12T08:00:00Z", category: "REQUEST_SOURCE_DRIFT_REVIEW" } as DriftOutcomeNote;
const prior = { kind: "rosevear_independent_source_drift_outcome_aging",
  exported_at: "2026-10-13T08:00:00Z", drift_outcomes: [before, after],
  renewal_receipt: { renewal_rechecks: [
    { latest_followup_index: 0, source_version_access_drift_claim: true },
    { latest_followup_index: 1, source_version_access_drift_claim: true },
  ] } } as DriftOutcomeReceipt;
const env: TrialEnvironment = { installed_version: "0.0.8-build171",
  access: "local_console", installed_windows_witnessed: true };
const at = "2026-11-11T08:00:00Z";

describe("Build 172 independent outcome exception recurrence and owner freshness", () => {
  it("retains repeated owner/source gaps, version conflict and overdue evidence even with later unverified observations", () => {
    const result = compareOutcomeExceptions(prior, 0, 1, at);
    expect(result).toMatchObject({ case_id: "cameras",
      owner_witness_fresh_since_prior_outcome: true,
      source_evidence_fresh_since_prior_outcome: true,
      repeated_owner_gap: true, repeated_source_gap: true,
      repeated_identity_drift: true, version_or_access_conflict: true,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toContain("REPEATED_OWNER_WITNESS_GAP");
    expect(result.signals).toContain("REPEATED_SOURCE_RENEWAL_GAP");
    expect(result.signals).toContain("REPEATED_OVERDUE_SOURCE");
    expect(result.signals).toContain("INDEPENDENT_HOLD_CONTINUES");
    const stale = { ...prior, drift_outcomes: [before,
      { ...after, latest_source_check_index: 0, latest_recheck_index: 0 }] };
    expect(compareOutcomeExceptions(stale, 0, 1, at).signals)
      .toContain("SOURCE_STILL_OVERDUE");
  });

  it("requires non-imported later outcome, witnessed Windows and independent HOLD confirmation", () => {
    const input = { baseline_outcome_index: 0, latest_outcome_index: 1,
      category: "REQUEST_RECURRING_SOURCE_REVIEW" as const,
      personally_rechecked: true, independent_hold_acknowledged: true };
    expect(() => recordExceptionRecurrence(prior, [], env, { outcomes: 2, recurrences: 0 },
      input, at)).toThrow(/non-imported/);
    expect(() => recordExceptionRecurrence(prior, [],
      { ...env, installed_windows_witnessed: false }, { outcomes: 0, recurrences: 0 },
      input, at)).toThrow(/Windows/);
    expect(() => recordExceptionRecurrence(prior, [], env,
      { outcomes: 0, recurrences: 0 },
      { ...input, independent_hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordExceptionRecurrence(prior, [], env,
      { outcomes: 0, recurrences: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_OUTCOME_EXCEPTION_RECURRENCE_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateExceptionRecurrences(prior, notes);
    expect(() => validateExceptionRecurrences(prior,
      [{ ...notes[0], earlier_outcome_age_days: 0 }])).toThrow(/immutable/);
    expect(() => validateExceptionRecurrences(prior,
      [{ ...notes[0], closure: "APPROVED" as never }])).toThrow(/HOLD/);
    expect(() => validateExceptionRecurrences(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
  });

  it("rejects cross-case and backward chronology and never imports a forged approval", () => {
    expect(() => compareOutcomeExceptions(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareOutcomeExceptions({ ...prior,
      drift_outcomes: [before, { ...after, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same watch/);
    expect(() => compareOutcomeExceptions(prior, 0, 1, "2026-10-11T08:00:00Z"))
      .toThrow(/chronological/);
    const notes = recordExceptionRecurrence(prior, [], env, { outcomes: 0, recurrences: 0 },
      { baseline_outcome_index: 0, latest_outcome_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_rechecked: true,
        independent_hold_acknowledged: true }, at);
    const receipt = createExceptionReceipt(prior, notes, "2026-11-12T08:00:00Z");
    expect(() => parseExceptionReceipt(JSON.stringify({ ...receipt, closure: "APPROVED" })))
      .toThrow(/Unsafe Build 172/);
    expect(() => parseExceptionReceipt(JSON.stringify({ ...receipt,
      exception_recurrences: [{ ...notes[0], signals: [] }] }))).toThrow(/immutable/);
  });

  it("compares complete Build 171 receipt prefixes, rejecting old-history edits", () => {
    const beforeRaw = JSON.stringify({ ...prior, drift_outcomes: [before] });
    const afterRaw = JSON.stringify({ ...prior,
      exported_at: "2026-11-12T08:00:00Z", drift_outcomes: [before, after] });
    expect(comparePrivateDriftOutcomeReceipts(beforeRaw, afterRaw))
      .toMatchObject({ previous_outcomes: 1, current_outcomes: 2, new_outcomes: 1 });
    expect(() => comparePrivateDriftOutcomeReceipts(beforeRaw,
      JSON.stringify({ ...prior, exported_at: "2026-11-12T08:00:00Z",
        drift_outcomes: [{ ...before, case_id: "home" }, after] }))).toThrow(/historical prefix/);
  });
});
