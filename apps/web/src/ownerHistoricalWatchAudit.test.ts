import { describe, expect, it } from "vitest";
import { compareHistoricalWatchFollowup, recordHistoricalWatchAudit,
  validateHistoricalWatchAudits } from "./ownerHistoricalWatchAudit";
import type { ExceptionWatchNote } from "./ownerRecheckDecisionWatch";
import type { TrialObservation, TrialEnvironment } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";

const environment: TrialEnvironment = { installed_version: "0.0.7-build161", access: "local_console",
  installed_windows_witnessed: true };
const watch: ExceptionWatchNote = { baseline_recheck_index: 0, latest_recheck_index: 1,
  review_index: 0, case_id: "cameras", baseline_at: "2026-10-11T10:00:00Z",
  latest_at: "2026-10-13T10:00:00Z", first_recheck_age_days: 2,
  signals: ["OUTCOME_ROUND_ADVANCED", "HISTORICAL_EXCEPTIONS_UNRESOLVED"], unresolved: true,
  recorded_at: "2026-10-14T10:00:00Z", category: "CONTINUE_INDEPENDENT_REVIEW_HOLD",
  personally_compared: true, hold_acknowledged: true, state: "PRIVATE_EXCEPTION_WATCH_NOT_SENT",
  field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
  closure: "NOT_AUTHORIZED" };
const history: TrialObservation[] = [
  { case_id: "cameras", outcome: "issue", finding: "playback_missing",
    next_owner: "camera_operator", witnessed_by_operator: true, acknowledged_at: null,
    observed_at: "2026-10-13T08:00:00Z" },
  { case_id: "cameras", outcome: "passed", finding: "none",
    next_owner: "household_owner", witnessed_by_operator: true, acknowledged_at: null,
    observed_at: "2026-10-16T08:00:00Z" },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", installed_version: "0.0.7-build161", access: "local_console",
    witnessed_on_windows: true, captured_at: "2026-10-13T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "confirmed_alias",
    safe_alias: "asset_123abc", installed_version: "0.0.7-build161", access: "local_console",
    witnessed_on_windows: true, captured_at: "2026-10-16T08:01:00Z" },
];
const at = "2026-10-25T08:00:00Z";

describe("Build 161 manual watch outcome follow-up and exception aging", () => {
  it("retains the full aged watch and unresolved historical exception after a reported pass", () => {
    const compared = compareHistoricalWatchFollowup([watch], history, checks, 0, 1, 1, at);
    expect(compared).toMatchObject({ watch_age_days: 10, original_exception_age_days: 13,
      watch_age_band: "OVER_SEVEN_DAYS", baseline_source_check_index: 0,
      owner_outcome: "passed", outstanding: true });
    expect(compared.signals).toContain("OWNER_IMPROVEMENT_UNVERIFIED");
    expect(compared.signals).toContain("INDEPENDENT_WATCH_OVERDUE");
    expect(compared.signals).toContain("HISTORICAL_EXCEPTION_UNRESOLVED");
    expect(compared.signals).not.toContain("SOURCE_IDENTITY_CONTRADICTION");
  });

  it("explicitly flags absent fresh source evidence and rejects unrelated or premature trials", () => {
    expect(compareHistoricalWatchFollowup([watch], history, checks, 0, 1, null, at).signals)
      .toContain("FRESH_SOURCE_WITNESS_MISSING");
    expect(() => compareHistoricalWatchFollowup([watch], history, checks, 0, 0, 0, at))
      .toThrow(/later owner observation/);
    expect(() => compareHistoricalWatchFollowup([watch], history, checks, 0, 1, 0, at))
      .toThrow(/exact later owner trial/);
    expect(() => compareHistoricalWatchFollowup([watch], history, checks, 0, 1, 1,
      "2026-10-14T09:00:00Z")).toThrow(/later owner observation/);
  });

  it("keeps imported observations and independent witness omissions incapable of creating a new audit", () => {
    const input = { watch_index: 0, observation_index: 1, source_check_index: 1,
      category: "CONTINUE_HISTORICAL_REVIEW_HOLD" as const,
      personally_witnessed: true, hold_acknowledged: true };
    expect(() => recordHistoricalWatchAudit([watch], history, checks, [], environment,
      { trials: 2, checks: 2, audits: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordHistoricalWatchAudit([watch], history, checks, [], environment,
      { trials: 0, checks: 0, audits: 0 }, { ...input, hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    expect(() => recordHistoricalWatchAudit([watch], history, checks, [],
      { ...environment, installed_windows_witnessed: false },
      { trials: 0, checks: 0, audits: 0 }, input, at)).toThrow(/Windows witness/);
  });

  it("validates immutable evidence, computed age, duplicate decisions and fixed review status", () => {
    const audits = recordHistoricalWatchAudit([watch], history, checks, [], environment,
      { trials: 0, checks: 0, audits: 0 }, { watch_index: 0, observation_index: 1,
        source_check_index: 1, category: "CONTINUE_HISTORICAL_REVIEW_HOLD",
        personally_witnessed: true, hold_acknowledged: true }, at);
    validateHistoricalWatchAudits(audits, [watch], history, checks);
    expect(() => validateHistoricalWatchAudits([{ ...audits[0], watch_age_band: "UNDER_THREE_DAYS" }],
      [watch], history, checks)).toThrow(/changed/);
    expect(() => validateHistoricalWatchAudits([{ ...audits[0], closure: "APPROVED" as never }],
      [watch], history, checks)).toThrow(/HOLD/);
    expect(() => validateHistoricalWatchAudits([audits[0], audits[0]], [watch], history, checks))
      .toThrow(/Duplicate/);
  });
});
