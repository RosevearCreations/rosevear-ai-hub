import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RenewalDispositionNote, RenewalDispositionReceipt } from "./ownerRenewalDisposition";
import { compareRenewalRecurrence, createRecurrenceReceipt, parseRecurrenceReceipt,
  recordRenewalRecurrence, validateRecurrenceNotes } from "./ownerRenewalRecurrence";

vi.mock("./ownerRenewalDisposition", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerRenewalDisposition")>(),
  parseRenewalDispositionReceipt: vi.fn(() => ({ trial: { observations: [] }, renewal_disposition_notes: [] })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2026-12-21T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const earlier = { case_id: "cameras", reassignment_watch_index: 1,
  earlier_renewal_index: 0, later_renewal_index: 1,
  recorded_at: "2026-12-01T08:00:00Z",
  repeated_owner_or_source_gap: true, repeated_source_drift: true,
  source_age_days: 10 } as RenewalDispositionNote;
const later = { ...earlier, later_renewal_index: 2,
  recorded_at: "2026-12-12T08:00:00Z", source_age_days: 12 } as RenewalDispositionNote;
const prior = { kind: "rosevear_private_renewal_watch_exception_disposition",
  schema_version: 1, exported_at: "2026-12-13T08:00:00Z",
  renewal_disposition_notes: [earlier, later] } as RenewalDispositionReceipt;
const env: TrialEnvironment = { installed_version: "0.0.10-build181",
  installed_windows_witnessed: true, access: "local_console" };
const input = { earlier_disposition_index: 0, later_disposition_index: 1,
  action: "CONTINUE_REVIEW_HOLD" as const,
  fresh_private_recheck: true, independent_hold_acknowledged: true };
const at = "2026-12-18T08:00:00Z";

describe("Build 181 private disposition recurrence and QL-253 HOLD", () => {
  it("classifies repeating gaps and overdue disposition but never authenticates a pin or owner", () => {
    const c = compareRenewalRecurrence(prior, 0, 1, at);
    expect(c).toMatchObject({ recurrence_age_days: 17,
      source_drift_or_gap_persisted: true, owner_test_decision: "NOT_GIVEN",
      pin_registry_witness: "NOT_AVAILABLE", relay_deployment: "NOT_AUTHORIZED",
      connection_state: "DISCONNECTED" });
    expect(c.signals).toContain("EARLIER_DISPOSITION_OVERDUE");
    expect(c.signals).toContain("QL253_PRIVATE_CUSTODIAN_REGISTRY_AND_DISTINCT_WITNESS_UNVERIFIED");
  });
  it("rejects out-of-order, cross-watch and nonprogressive disposition", () => {
    expect(() => compareRenewalRecurrence(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareRenewalRecurrence({ ...prior,
      renewal_disposition_notes: [earlier, { ...later, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-watch/);
    expect(() => compareRenewalRecurrence({ ...prior,
      renewal_disposition_notes: [earlier, { ...later, later_renewal_index: 0 }] }, 0, 1, at))
      .toThrow(/later/);
  });
  it("requires new disposition, Windows recheck and separate HOLD acknowledgement", () => {
    expect(() => recordRenewalRecurrence(prior, [], env,
      { dispositions: 2, recurrences: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordRenewalRecurrence(prior, [], { ...env, installed_windows_witnessed: false },
      { dispositions: 0, recurrences: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordRenewalRecurrence(prior, [], env,
      { dispositions: 0, recurrences: 0 }, { ...input, independent_hold_acknowledged: false }, at))
      .toThrow(/HOLD/);
    const notes = recordRenewalRecurrence(prior, [], env,
      { dispositions: 0, recurrences: 0 }, input, at);
    validateRecurrenceNotes(prior, notes);
    expect(() => validateRecurrenceNotes(prior,
      [{ ...notes[0], owner_test_decision: "GIVEN" as never }])).toThrow(/comparison/);
    expect(() => validateRecurrenceNotes(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
    const receipt = createRecurrenceReceipt(prior, notes, "2026-12-19T08:00:00Z");
    expect(parseRecurrenceReceipt(JSON.stringify(receipt)).recurrence_notes).toHaveLength(1);
    expect(() => parseRecurrenceReceipt(JSON.stringify({ ...receipt,
      relay_deployment: "AUTHORIZED" }))).toThrow(/Unsafe Build 181/);
  });
  it("permits only fixed HOLD action supported by original comparison", () => {
    const noGap = { ...prior, renewal_disposition_notes: [
      { ...earlier, repeated_owner_or_source_gap: false, repeated_source_drift: false,
        source_age_days: 1 },
      { ...later, repeated_owner_or_source_gap: false, repeated_source_drift: false,
        source_age_days: 1 },
    ] };
    expect(() => recordRenewalRecurrence(noGap, [], env,
      { dispositions: 0, recurrences: 0 },
      { ...input, action: "REQUEST_NEW_ORIGINAL_OWNER_SOURCE_WITNESS" }, at))
      .toThrow(/matching unresolved source gap/);
  });
});
