import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { TriageExceptionNote, TriageExceptionReceipt } from "./ownerTriageExceptionAging";
import { compareExceptionRenewal, compareHistoricalRenewalWatches,
  createRenewalWatchReceipt, parseRenewalWatchReceipt, recordRenewalWatch,
  validateRenewalWatchNotes } from "./ownerExceptionRenewalWatch";

// Stub ONLY the already-covered Build 178 nested parser; this suite isolates Build 179 gates.
vi.mock("./ownerTriageExceptionAging", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerTriageExceptionAging")>(),
  parseTriageExceptionReceipt: vi.fn(() => ({ trial: { observations: [] },
    triage_exception_notes: [] })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-28T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const first = {
  case_id: "cameras", reassignment_watch_index: 0, later_continuity_index: 1,
  recorded_at: "2026-11-11T08:00:00Z", later_owner_witness_claim: false,
  later_distinct_source_claim: false, source_identity_drift: false,
  source_age_days: 5, signals: ["POST_CONTINUITY_OWNER_MISSING", "POST_CONTINUITY_SOURCE_MISSING"],
} as TriageExceptionNote;
const second = {
  ...first, later_continuity_index: 2, recorded_at: "2026-11-21T08:00:00Z",
  later_owner_witness_claim: true, later_distinct_source_claim: true,
  source_identity_drift: true, source_age_days: 9,
} as TriageExceptionNote;
const prior = {
  kind: "rosevear_private_triage_exception_aging_followup", schema_version: 1,
  exported_at: "2026-11-22T08:00:00Z", triage_exception_notes: [first, second],
} as TriageExceptionReceipt;
const env: TrialEnvironment = { installed_version: "0.0.10-build179",
  installed_windows_witnessed: true, access: "local_console" };
const input = { earlier_exception_index: 0, later_exception_index: 1,
  category: "CONTINUE_INDEPENDENT_HOLD" as const, personally_rechecked: true,
  separate_hold_acknowledged: true };
const at = "2026-11-26T08:00:00Z";

describe("Build 179 private exception renewal", () => {
  it("flags held source/owner recurrence and age without independent source authentication", () => {
    const result = compareExceptionRenewal(prior, 0, 1, at);
    expect(result).toMatchObject({ repeated_owner_gap: true, repeated_source_gap: true,
      unresolved_source_drift: true, earlier_exception_age_days: 15,
      age_band: "OVER_SEVEN_DAYS", source_age_days: 14,
      later_owner_claim: true, later_source_claim: true,
      independent_source_provenance: "UNVERIFIED", owner_test_decision: "NOT_GIVEN",
      closure: "NOT_AUTHORIZED" });
    expect(result.signals).toContain("QL252_SOURCE_PROOF_MISSING_OR_UNVERIFIED");
    expect(result.signals).toContain("LATER_PRIVATE_OWNER_CLAIM_UNVERIFIED");
    expect(result.signals).toContain("PRIVATE_RUNNER_AND_OWNER_APPROVAL_NOT_GIVEN");
  });
  it("rejects stale, cross-watch or reversed evidence", () => {
    expect(() => compareExceptionRenewal(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareExceptionRenewal({ ...prior, triage_exception_notes: [
      first, { ...second, case_id: "home" }] }, 0, 1, at)).toThrow(/same-watch/);
    expect(() => compareExceptionRenewal({ ...prior, triage_exception_notes: [
      first, { ...second, later_continuity_index: 1 }] }, 0, 1, at)).toThrow(/later continuity/);
    expect(() => compareExceptionRenewal(prior, 0, 1,
      "2026-11-19T08:00:00Z")).toThrow(/chronological/);
  });
  it("requires a non-imported later note, witnessed Windows and two independent HOLD acknowledgments", () => {
    expect(() => recordRenewalWatch(prior, [], env,
      { exceptions: 2, watches: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordRenewalWatch(prior, [], { ...env, installed_windows_witnessed: false },
      { exceptions: 0, watches: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordRenewalWatch(prior, [], env,
      { exceptions: 0, watches: 0 }, { ...input, separate_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    expect(() => recordRenewalWatch(prior, [], env,
      { exceptions: 0, watches: 0 }, { ...input, category: "REQUEST_NEW_OWNER_WITNESS" }, at))
      .not.toThrow();
    const notes = recordRenewalWatch(prior, [], env,
      { exceptions: 0, watches: 0 }, input, at);
    validateRenewalWatchNotes(prior, notes);
    expect(() => validateRenewalWatchNotes(prior,
      [{ ...notes[0], later_owner_claim: false }])).toThrow(/immutable/);
    expect(() => validateRenewalWatchNotes(prior,
      [{ ...notes[0], owner_test_decision: "AUTHORIZED" as never }])).toThrow(/immutable/);
    expect(() => validateRenewalWatchNotes(prior, [notes[0], notes[0]])).toThrow(/Duplicate/);
    const receipt = createRenewalWatchReceipt(prior, notes, "2026-11-27T08:00:00Z");
    expect(parseRenewalWatchReceipt(JSON.stringify(receipt)).renewal_watch_notes).toHaveLength(1);
    expect(() => parseRenewalWatchReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 179/);
    expect(() => parseRenewalWatchReceipt(JSON.stringify({ ...receipt,
      ql252_proof: "VERIFIED" }))).toThrow(/Unsafe Build 179/);
  });
  it("preserves complete immutable Build 178 historical prefixes", () => {
    const before = { ...prior, exported_at: "2026-11-15T08:00:00Z",
      triage_exception_notes: [first] };
    expect(compareHistoricalRenewalWatches(JSON.stringify(before), JSON.stringify(prior)))
      .toMatchObject({ previous_exceptions: 1, new_exceptions: 1, current_exceptions: 2 });
    expect(() => compareHistoricalRenewalWatches(JSON.stringify(before), JSON.stringify({
      ...prior, triage_exception_notes: [{ ...first, case_id: "home" }, second],
    }))).toThrow(/append-only/);
  });
});
