import { afterAll, describe, expect, it, vi } from "vitest";
import type { TrialEnvironment } from "./ownerFieldTrial";
import type { RecurrenceNote, RecurrenceReceipt } from "./ownerRenewalRecurrence";
import { compareRecurrenceReassessment, createReassessmentReceipt, parseReassessmentReceipt,
  recordRecurrenceReassessment, validateReassessmentNotes } from "./ownerRecurrenceReassessment";

vi.mock("./ownerRenewalRecurrence", async importOriginal => ({
  ...await importOriginal<typeof import("./ownerRenewalRecurrence")>(),
  parseRecurrenceReceipt: vi.fn(() => ({ trial: { observations: [] }, recurrence_notes: [] })),
}));
vi.useFakeTimers(); vi.setSystemTime(new Date("2027-01-16T12:00:00Z"));
afterAll(() => vi.useRealTimers());
const older = { case_id: "cameras", reassignment_watch_index: 1,
  earlier_disposition_index: 0, later_disposition_index: 1,
  recorded_at: "2026-12-16T08:00:00Z", source_drift_or_gap_persisted: true } as RecurrenceNote;
const newer = { ...older, later_disposition_index: 2,
  recorded_at: "2027-01-03T08:00:00Z" } as RecurrenceNote;
const prior = { kind: "rosevear_private_renewal_disposition_exception_recurrence",
  schema_version: 1, exported_at: "2027-01-04T08:00:00Z",
  recurrence_notes: [older, newer] } as RecurrenceReceipt;
const env: TrialEnvironment = { installed_version: "0.0.10-build182",
  installed_windows_witnessed: true, access: "local_console" };
const input = { earlier_recurrence_index: 0, later_recurrence_index: 1,
  action: "CONTINUE_INDEPENDENT_HOLD" as const,
  fresh_installed_windows_review: true, separate_hold_attestation: true };
const at = "2027-01-10T08:00:00Z";

describe("Build 182 private recurrence reassessment and QL-254 hold", () => {
  it("detects overdue recurrence and persistent gap without upgrading proof or owner trust", () => {
    const r = compareRecurrenceReassessment(prior, 0, 1, at);
    expect(r).toMatchObject({ earlier_age_days: 25, persistent_original_gap: true,
      public_original_proof: "NOT_VERIFIED", out_of_band_registry: "NOT_VERIFIED",
      owner_test_decision: "NOT_GIVEN", private_relay: "NOT_INSTALLED_OR_AUTHORIZED",
      connection_state: "DISCONNECTED" });
    expect(r.signals).toContain("OLDER_RECURRENCE_OVERDUE");
    expect(r.signals).toContain("PRIVATE_MINISERVER_ROLLBACK_SIMULATION_ONLY");
  });
  it("rejects cross-case, reversed or repeated nonprogressive source index", () => {
    expect(() => compareRecurrenceReassessment(prior, 1, 0, at)).toThrow(/chronological/);
    expect(() => compareRecurrenceReassessment({ ...prior,
      recurrence_notes: [older, { ...newer, case_id: "home" }] }, 0, 1, at))
      .toThrow(/same-case/);
    expect(() => compareRecurrenceReassessment({ ...prior,
      recurrence_notes: [older, { ...newer, later_disposition_index: 1 }] }, 0, 1, at))
      .toThrow(/later disposition/);
  });
  it("requires fresh non-imported recurrence, Windows witness and two separate HOLD acknowledgements", () => {
    expect(() => recordRecurrenceReassessment(prior, [], env,
      { recurrences: 2, reassessments: 0 }, input, at)).toThrow(/non-imported/);
    expect(() => recordRecurrenceReassessment(prior, [], { ...env, installed_windows_witnessed: false },
      { recurrences: 0, reassessments: 0 }, input, at)).toThrow(/Windows/);
    expect(() => recordRecurrenceReassessment(prior, [], env,
      { recurrences: 0, reassessments: 0 }, { ...input, separate_hold_attestation: false }, at))
      .toThrow(/HOLD/);
    const notes = recordRecurrenceReassessment(prior, [], env,
      { recurrences: 0, reassessments: 0 }, input, at);
    validateReassessmentNotes(prior, notes);
    expect(() => validateReassessmentNotes(prior,
      [{ ...notes[0], owner_test_decision: "GIVEN" as never }])).toThrow(/immutable/);
    expect(() => validateReassessmentNotes(prior, [...notes, notes[0]])).toThrow(/Duplicate/);
    const receipt = createReassessmentReceipt(prior, notes, "2027-01-11T08:00:00Z");
    expect(parseReassessmentReceipt(JSON.stringify(receipt)).reassessment_notes).toHaveLength(1);
    expect(() => parseReassessmentReceipt(JSON.stringify({ ...receipt,
      owner_test_decision: "APPROVED" }))).toThrow(/Unsafe Build 182/);
  });
  it("original-source gap category cannot be chosen when recurrence gap has cleared", () => {
    const noGap = { ...prior, recurrence_notes: [
      { ...older, source_drift_or_gap_persisted: false },
      { ...newer, source_drift_or_gap_persisted: false },
    ] };
    expect(() => recordRecurrenceReassessment(noGap, [], env,
      { recurrences: 0, reassessments: 0 },
      { ...input, action: "REQUEST_NEW_OWNER_SOURCE_ORIGINALS" }, at))
      .toThrow(/matching unresolved original gap/);
  });
});
