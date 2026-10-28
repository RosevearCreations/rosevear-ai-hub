import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment, TrialObservation } from "./ownerFieldTrial";
import type { SourceIdentityCheck } from "./ownerFieldRouting";
import type { AgingAuditNote } from "./ownerOutcomeAgingAudit";
import type { FollowupNote } from "./ownerOutcomeAgingFollowup";
import { compareEvidenceRenewal, comparePrivateFollowupReceipts,
  parseRenewalReceipt, recordRenewalRecheck, validateRenewalRechecks } from "./ownerEvidenceRenewalRecheck";

// Build 169's full nested chronology has its own real-chain tests; isolate Build 170
// immutability and fresh identity-drift signals here while retaining all other guards.
vi.mock("./ownerOutcomeAgingFollowup", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerOutcomeAgingFollowup")>(),
  validateAgingFollowups: vi.fn(),
}));
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const environment: TrialEnvironment = { installed_version: "0.0.7-build170",
  access: "local_console", installed_windows_witnessed: true };
const history: TrialObservation[] = [
  { case_id: "cameras", observed_at: "2026-09-30T08:00:00Z", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed_by_operator: true, acknowledged_at: null },
  { case_id: "cameras", observed_at: "2026-10-10T08:00:00Z", outcome: "issue",
    finding: "stale_evidence", next_owner: "camera_operator", witnessed_by_operator: true, acknowledged_at: null },
];
const checks: SourceIdentityCheck[] = [
  { case_id: "cameras", trial_index: 0, identity_state: "confirmed_alias",
    safe_alias: "asset_111aaa", installed_version: "0.0.7-build170", access: "local_console",
    witnessed_on_windows: true, captured_at: "2026-09-30T08:01:00Z" },
  { case_id: "cameras", trial_index: 1, identity_state: "operator_mismatch",
    safe_alias: "asset_222bbb", installed_version: "0.0.8-build170", access: "tailnet",
    witnessed_on_windows: true, captured_at: "2026-10-11T08:01:00Z" },
];
const audits = [
  { latest_observation_index: 0 }, { latest_observation_index: 1 },
] as AgingAuditNote[];
const rounds = [
  { case_id: "cameras", reassignment_watch_index: 0, latest_audit_index: 0,
    latest_source_check_index: 0, latest_owner_outcome: "passed", latest_owner_claim: "household_owner",
    recorded_at: "2026-10-01T08:00:00Z" },
  { case_id: "cameras", reassignment_watch_index: 0, latest_audit_index: 1,
    latest_source_check_index: 1, latest_owner_outcome: "issue", latest_owner_claim: "camera_operator",
    recorded_at: "2026-10-12T08:00:00Z" },
] as FollowupNote[];
const at = "2026-11-11T08:00:00Z";
const compare = (items: FollowupNote[] = rounds, inspectedAt = at) =>
  compareEvidenceRenewal(items, audits, [], [], [], [], [], history, checks, 0, 1, inspectedAt);

describe("Build 170 independent evidence renewal and source identity drift recheck", () => {
  it("flags renewed but unverified alias/identity/version/access drift and repeated overdue source", () => {
    const result = compare();
    expect(result).toMatchObject({ case_id: "cameras", newer_owner_trial_since_followup: true,
      renewed_source_since_followup: true, source_identity_drift_claim: true,
      source_version_access_drift_claim: true, latest_confirmed_alias_claim: false,
      age_band: "OVER_SEVEN_DAYS", unresolved: true });
    expect(result.signals).toContain("SOURCE_RENEWED_PRIVATE_ONLY");
    expect(result.signals).toContain("SOURCE_ALIAS_OR_IDENTITY_DRIFT");
    expect(result.signals).toContain("SOURCE_VERSION_OR_ACCESS_DRIFT");
    expect(result.signals).toContain("REPEATED_OVERDUE_SOURCE_EVIDENCE");
    expect(result.signals).toContain("OWNER_OUTCOME_DRIFT_PERSISTS");
    expect(result.signals).toContain("INDEPENDENT_HOLD_CONTINUES");
  });

  it("reports a repeated unchanged source as not renewed, and missing evidence as overdue", () => {
    const stale = compare([rounds[0], { ...rounds[1], latest_source_check_index: 0 }]);
    expect(stale.renewed_source_since_followup).toBe(false);
    expect(stale.signals).toContain("SOURCE_RECHECK_NOT_RENEWED");
    expect(stale.source_identity_drift_claim).toBe(false);
    const missing = compare([rounds[0], { ...rounds[1], latest_source_check_index: null }]);
    expect(missing.latest_source_age_days).toBeNull();
    expect(missing.signals).toContain("SOURCE_EVIDENCE_OVERDUE");
    expect(missing.signals).toContain("SOURCE_IDENTITY_NOT_AUTHENTICATED");
  });

  it("requires later local note, witnessed installed Windows and two HOLD confirmations", () => {
    const input = { baseline_followup_index: 0, latest_followup_index: 1,
      category: "REQUEST_SOURCE_IDENTITY_DRIFT_RECHECK" as const,
      personally_rechecked: true, hold_acknowledged: true };
    expect(() => recordRenewalRecheck(rounds, audits, [], [], [], [], [], history,
      checks, [], environment, { followups: 2, rechecks: 0 }, input, at))
      .toThrow(/non-imported/);
    expect(() => recordRenewalRecheck(rounds, audits, [], [], [], [], [], history,
      checks, [], { ...environment, installed_windows_witnessed: false },
      { followups: 0, rechecks: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordRenewalRecheck(rounds, audits, [], [], [], [], [], history,
      checks, [], environment, { followups: 0, rechecks: 0 },
      { ...input, hold_acknowledged: false }, at)).toThrow(/HOLD/);
    const records = recordRenewalRecheck(rounds, audits, [], [], [], [], [], history,
      checks, [], environment, { followups: 0, rechecks: 0 }, input, at);
    expect(records[0]).toMatchObject({ state: "PRIVATE_EVIDENCE_RENEWAL_RECHECK_NOT_SENT",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", independent_review: "INDEPENDENT_REVIEW_HOLD",
      closure: "NOT_AUTHORIZED" });
    validateRenewalRechecks(records, rounds, audits, [], [], [], [], [], history, checks);
    expect(() => validateRenewalRechecks([{ ...records[0], latest_source_age_days: 0 }],
      rounds, audits, [], [], [], [], [], history, checks)).toThrow(/immutable/);
    expect(() => validateRenewalRechecks([{ ...records[0], closure: "APPROVED" as never }],
      rounds, audits, [], [], [], [], [], history, checks)).toThrow(/HOLD/);
    expect(() => validateRenewalRechecks([records[0], records[0]], rounds, audits,
      [], [], [], [], [], history, checks)).toThrow(/Duplicate/);
  });

  it("rejects backward audit references, changed cases and forged approved receipts", () => {
    expect(() => compareEvidenceRenewal(rounds, audits, [], [], [], [], [], history,
      checks, 1, 0, at)).toThrow(/chronological/);
    expect(() => compare([rounds[0], { ...rounds[1], case_id: "devices" }]))
      .toThrow(/original held watch/);
    expect(() => compare([rounds[0], { ...rounds[1], latest_audit_index: -1 }]))
      .toThrow(/audit regression/);
    expect(() => compare(rounds, "2026-10-11T00:00:00Z"))
      .toThrow(/chronological/);
    expect(() => parseRenewalReceipt(JSON.stringify({
      kind: "rosevear_independent_evidence_renewal_drift_recheck",
      schema_version: 1, exported_at: at, field_acceptance: "APPROVED",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED",
      automatic_dispatch: "DISABLED", automatic_reassignment: "DISABLED",
      evidence_authenticity: "UNVERIFIED_PRIVATE_ATTESTATIONS",
      followup_receipt: {}, renewal_rechecks: [],
    }))).toThrow(/Unsafe Build 170/);
    expect(() => comparePrivateFollowupReceipts("{}", "{}"))
      .toThrow(/Two chronological complete Build 169/);
  });
});
