import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalWatchNote, RenewalWatchReceipt } from "./ownerExceptionRenewalWatch";
import { compareHistoricalRenewalDispositions, compareRenewalDisposition,
  createRenewalDispositionReceipt, parseRenewalDispositionReceipt,
  recordRenewalDisposition, validateRenewalDispositionNotes } from "./ownerRenewalDisposition";

// Build 179's full nested parser has its own tests; this suite isolates Build 180 invariants.
vi.mock("./ownerExceptionRenewalWatch", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerExceptionRenewalWatch")>(),
  parseRenewalWatchReceipt: vi.fn(() => ({ trial: { observations: [] }, renewal_watch_notes: [] })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-12-05T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const earlier = { case_id: "cameras", reassignment_watch_index: 1,
  later_exception_index: 2, recorded_at: "2026-11-15T08:00:00Z",
  repeated_owner_gap: true, repeated_source_gap: true,
  unresolved_source_drift: true, source_age_days: 8,
  later_owner_claim: false, later_source_claim: false } as RenewalWatchNote;
const later = { ...earlier, later_exception_index: 3,
  recorded_at: "2026-11-25T08:00:00Z", source_age_days: 10,
  later_owner_claim: true, later_source_claim: true } as RenewalWatchNote;
const prior = { kind: "rosevear_private_exception_renewal_watch", schema_version: 1,
  exported_at: "2026-11-26T08:00:00Z", renewal_watch_notes: [earlier, later] } as RenewalWatchReceipt;
const env: TrialEnvironment = { installed_version: "0.0.10-build180",
  installed_windows_witnessed: true, access: "local_console" };
const input = { earlier_renewal_index: 0, later_renewal_index: 1,
  category: "CONTINUE_INDEPENDENT_HOLD" as const,
  personally_rechecked: true, separate_hold_acknowledged: true };
const at = "2026-12-01T08:00:00Z";

describe("Build 180 private held renewal disposition and QL-252 source proof", () => {
  it("classifies later private evidence as unverified and cannot clear source/owner holds", () => {
    const c = compareRenewalDisposition(prior, 0, 1, at);
    expect(c).toMatchObject({ repeated_owner_or_source_gap: true,
      repeated_source_drift: true, later_owner_claim: true, later_source_claim: true,
      earlier_renewal_age_days: 16, source_age_days: 16,
      age_band: "OVER_SEVEN_DAYS", original_source_proof: "UNVERIFIED_OR_MISSING",
      owner_test_decision: "NOT_GIVEN", connection_state: "DISCONNECTED",
      independent_review: "INDEPENDENT_REVIEW_HOLD", closure: "NOT_AUTHORIZED" });
    expect(c.signals).toContain("QL252_OUT_OF_BAND_CUSTODY_AND_DENIAL_WITNESS_NOT_AVAILABLE");
    expect(c.signals).toContain("LATER_PRIVATE_CLAIMS_NOT_ORIGINAL_WITNESSES");
  });
  it("refuses cross-watch or nonprogressive renewal evidence and reversed timeline", () => {
    expect(() => compareRenewalDisposition(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareRenewalDisposition({ ...prior,
      renewal_watch_notes: [earlier, { ...later, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareRenewalDisposition({ ...prior,
      renewal_watch_notes: [earlier, { ...later, later_exception_index: 1 }] }, 0, 1, at))
      .toThrow(/later exception/);
    expect(() => compareRenewalDisposition(prior, 0, 1,
      "2026-11-20T08:00:00Z")).toThrow(/chronological/);
  });
  it("gates append-only NOT SENT notes behind fresh later renewal and two HOLD acknowledgements", () => {
    expect(() => recordRenewalDisposition(prior, [], env,
      { renewals: 2, dispositions: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordRenewalDisposition(prior, [],
      { ...env, installed_windows_witnessed: false },
      { renewals: 0, dispositions: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordRenewalDisposition(prior, [], env,
      { renewals: 0, dispositions: 0 }, { ...input, separate_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    const notes = recordRenewalDisposition(prior, [], env,
      { renewals: 0, dispositions: 0 }, input, at);
    validateRenewalDispositionNotes(prior, notes);
    expect(() => validateRenewalDispositionNotes(prior,
      [{ ...notes[0], owner_test_decision: "GIVEN" as never }])).toThrow(/immutable/);
    expect(() => validateRenewalDispositionNotes(prior, [notes[0], notes[0]])).toThrow(/Duplicate/);
    const receipt = createRenewalDispositionReceipt(prior, notes, "2026-12-02T08:00:00Z");
    expect(parseRenewalDispositionReceipt(JSON.stringify(receipt)).renewal_disposition_notes)
      .toHaveLength(1);
    expect(() => parseRenewalDispositionReceipt(JSON.stringify({ ...receipt,
      connection_state: "CONNECTED" }))).toThrow(/Unsafe Build 180/);
  });
  it("rejects mutation of a historical Build 179 prefix", () => {
    const before = { ...prior, exported_at: "2026-11-20T08:00:00Z",
      renewal_watch_notes: [earlier] };
    expect(compareHistoricalRenewalDispositions(JSON.stringify(before), JSON.stringify(prior)))
      .toMatchObject({ previous_renewals: 1, new_renewals: 1, current_renewals: 2 });
    expect(() => compareHistoricalRenewalDispositions(JSON.stringify(before), JSON.stringify({
      ...prior, renewal_watch_notes: [{ ...earlier, case_id: "home" }, later],
    }))).toThrow(/append-only/);
  });
});
