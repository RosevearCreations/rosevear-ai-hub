import { afterAll, describe, expect, it, vi } from "vitest";
import type { RenewalReceipt, RenewalNote } from "./ownerEvidenceRenewalRecheck";
import type { TrialEnvironment } from "./ownerFieldTrial";
import { compareDriftOutcomes, createDriftOutcomeReceipt, parseDriftOutcomeReceipt,
  comparePrivateRenewalReceipts, recordDriftOutcome, validateDriftOutcomeNotes } from "./ownerSourceDriftOutcome";

vi.mock("./ownerEvidenceRenewalRecheck", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerEvidenceRenewalRecheck")>(),
  parseRenewalReceipt: vi.fn((raw: string) => ({
    checks: [
      { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias",
        safe_alias: "asset_111aaa", installed_version: "0.0.7-build170", access: "local_console",
        witnessed_on_windows: true, captured_at: "2026-09-20T08:00:00Z" },
      { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch",
        safe_alias: "asset_222bbb", installed_version: "0.0.8-build170", access: "tailnet",
        witnessed_on_windows: true, captured_at: "2026-10-02T08:00:00Z" },
    ],
    trial: { observations: [
      { case_id: "cameras", observed_at: "2026-09-20T08:00:00Z", witnessed_by_operator: true },
      { case_id: "cameras", observed_at: "2026-10-02T08:00:00Z", witnessed_by_operator: true },
    ] },
    aging_followups: [{ latest_audit_index: 0 }, { latest_audit_index: 1 }],
    aging_audits: [{ latest_observation_index: 0 }, { latest_observation_index: 1 }],
    renewal_rechecks: JSON.parse(raw).renewal_rechecks ?? [],
  })),
}));
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const baseline = { case_id: "cameras", reassignment_watch_index: 0,
  latest_followup_index: 0, latest_source_check_index: 0,
  latest_owner_claim: "household_owner", latest_owner_outcome: "passed",
  recorded_at: "2026-10-01T08:00:00Z", source_identity_drift_claim: false,
  source_version_access_drift_claim: false } as RenewalNote;
const newest = { ...baseline, latest_followup_index: 1, latest_source_check_index: 1,
  latest_owner_claim: "camera_operator", latest_owner_outcome: "issue",
  recorded_at: "2026-10-12T08:00:00Z", source_identity_drift_claim: true,
  source_version_access_drift_claim: true } as RenewalNote;
const prior = { kind: "rosevear_independent_evidence_renewal_drift_recheck",
  exported_at: "2026-10-13T08:00:00Z",
  renewal_rechecks: [baseline, newest] } as RenewalReceipt;
const at = "2026-11-11T08:00:00Z";
const env: TrialEnvironment = { installed_version: "0.0.8-build170",
  access: "local_console", installed_windows_witnessed: true };

describe("Build 171 independent source drift outcome aging and owner continuity", () => {
  it("flags private alias/access drift, repeated overdue age and missing later owner witness", () => {
    const outcome = compareDriftOutcomes(prior, 0, 1, at);
    expect(outcome).toMatchObject({ case_id: "cameras", owner_witness_continuity: true,
      source_renewed_after_prior_recheck: true, identity_or_access_drift_continues: true,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(outcome.signals).toContain("SOURCE_AGE_REPEATED_OVERDUE");
    expect(outcome.signals).toContain("OWNER_CLAIM_CHANGED");
    expect(outcome.signals).toContain("INDEPENDENT_HOLD_CONTINUES");
    const noContinuity = { ...prior, renewal_rechecks: [
      baseline, { ...newest, latest_followup_index: 0, latest_source_check_index: 0 }] };
    expect(compareDriftOutcomes(noContinuity, 0, 1, at).signals)
      .toContain("OWNER_WITNESS_GAP");
    expect(compareDriftOutcomes(noContinuity, 0, 1, at).signals)
      .toContain("SOURCE_RENEWAL_STILL_UNVERIFIED");
  });

  it("requires a non-imported newer held recheck and separate fresh Windows confirmations", () => {
    const input = { baseline_recheck_index: 0, latest_recheck_index: 1,
      category: "REQUEST_SOURCE_DRIFT_REVIEW" as const,
      personally_compared: true, permanent_hold_acknowledged: true };
    expect(() => recordDriftOutcome(prior, [], env, { rechecks: 2, outcomes: 0 },
      input, at)).toThrow(/non-imported/);
    expect(() => recordDriftOutcome(prior, [], { ...env, installed_windows_witnessed: false },
      { rechecks: 0, outcomes: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordDriftOutcome(prior, [], env, { rechecks: 0, outcomes: 0 },
      { ...input, permanent_hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const notes = recordDriftOutcome(prior, [], env, { rechecks: 0, outcomes: 0 }, input, at);
    expect(notes[0]).toMatchObject({ state: "PRIVATE_DRIFT_OUTCOME_AGING_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateDriftOutcomeNotes(prior, notes);
    expect(() => validateDriftOutcomeNotes(prior,
      [{ ...notes[0], latest_source_age_days: 0 }])).toThrow(/immutable/);
    expect(() => validateDriftOutcomeNotes(prior,
      [{ ...notes[0], closure: "APPROVED" as never }])).toThrow(/HOLD/);
    expect(() => validateDriftOutcomeNotes(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
  });

  it("rejects cross-watch, backward chronology and tampered import gates", () => {
    expect(() => compareDriftOutcomes(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareDriftOutcomes({ ...prior, renewal_rechecks: [baseline,
      { ...newest, case_id: "home" }] }, 0, 1, at)).toThrow(/same held watch/);
    expect(() => compareDriftOutcomes(prior, 0, 1, "2026-10-11T08:00:00Z"))
      .toThrow(/chronological/);
    const records = recordDriftOutcome(prior, [], env, { rechecks: 0, outcomes: 0 },
      { baseline_recheck_index: 0, latest_recheck_index: 1,
        category: "CONTINUE_INDEPENDENT_HOLD", personally_compared: true,
        permanent_hold_acknowledged: true }, at);
    const receipt = createDriftOutcomeReceipt(prior, records, "2026-11-12T08:00:00Z");
    expect(() => parseDriftOutcomeReceipt(JSON.stringify({ ...receipt,
      closure: "APPROVED" }))).toThrow(/Unsafe Build 171/);
    expect(() => parseDriftOutcomeReceipt(JSON.stringify({ ...receipt,
      drift_outcomes: [{ ...records[0], signals: [] }] }))).toThrow(/immutable/);
  });

  it("compares complete Build 170 historical prefixes with regenerated export timestamps", () => {
    const earlier = { ...prior, exported_at: "2026-10-13T08:00:00Z",
      renewal_rechecks: [baseline] };
    const newer = { ...prior, exported_at: "2026-11-12T08:00:00Z",
      renewal_rechecks: [baseline, newest] };
    expect(comparePrivateRenewalReceipts(JSON.stringify(earlier), JSON.stringify(newer)))
      .toMatchObject({ previous_rechecks: 1, current_rechecks: 2, new_rechecks: 1 });
    expect(() => comparePrivateRenewalReceipts(JSON.stringify(earlier),
      JSON.stringify({ ...newer, renewal_rechecks: [{ ...baseline, case_id: "home" }, newest] })))
      .toThrow(/historical prefix/);
    expect(() => comparePrivateRenewalReceipts(JSON.stringify(newer),
      JSON.stringify(earlier))).toThrow(/chronological/);
  });
});
