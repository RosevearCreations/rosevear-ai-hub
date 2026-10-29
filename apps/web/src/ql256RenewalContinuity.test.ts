import { describe, expect, it } from "vitest";
import { summarizeQl256Continuity } from "./ql256RenewalContinuity";
import type { ReassessmentNote } from "./ownerRecurrenceReassessment";

const at = new Date().toISOString();
const note = (date: string, gap = true): ReassessmentNote => ({
  earlier_recurrence_index: 0, later_recurrence_index: 1, case_id: "private-case" as ReassessmentNote["case_id"],
  reassignment_watch_index: 2, earlier_disposition_index: 0, later_disposition_index: 1,
  earlier_at: date, later_at: date, earlier_age_days: 0, persistent_original_gap: gap,
  signals: ["REPEATED_PRIVATE_RECURRENCE"], public_original_proof: "NOT_VERIFIED",
  out_of_band_registry: "NOT_VERIFIED", owner_test_decision: "NOT_GIVEN",
  private_relay: "NOT_INSTALLED_OR_AUTHORIZED", connection_state: "DISCONNECTED",
  closure: "NOT_AUTHORIZED", recorded_at: date,
  action: "CONTINUE_INDEPENDENT_HOLD", fresh_installed_windows_review: true,
  separate_hold_attestation: true, state: "PRIVATE_RECURRENCE_REASSESSMENT_NOT_SENT",
});

describe("Build 183 read-only QL-256 continuity", () => {
  it("records the exact private exception gap and no fictional signer or approval", () => {
    const result = summarizeQl256Continuity([note(at)], at);
    expect(result.repeated_original_source_gaps).toBe(1);
    expect(result.unique_case_watch_pairs).toBe(1);
    expect(result.actual_signer_provisioning).toBe("SIGNER_STATUS_UNKNOWN");
    expect(result.trusted_custodian_and_witness).toBe("PRIVATE_ASSIGNMENT_REQUIRED");
    expect(result.original_signed_proof_B).toBe("NOT_AVAILABLE");
    expect(result.owner_test_decision).toBe("NOT_GIVEN");
    expect(result.relay_installation).toBe("NO");
  });
  it("ages stale private reassessments without promoting imported history", () => {
    const old = new Date(Date.now() - 9 * 86_400_000).toISOString();
    const result = summarizeQl256Continuity([note(old), note(at, false)], at);
    expect(result.aging_over_seven_days).toBe(1);
    expect(result.repeated_original_source_gaps).toBe(1);
    expect(result.current_private_status).toBe("RECHECK_REQUIRED");
  });
  it("rejects future private note claims and leaves empty records unverified", () => {
    expect(summarizeQl256Continuity([], at).current_private_status).toBe("NO_PRIVATE_REASSESSMENTS");
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(() => summarizeQl256Continuity([note(future)], at)).toThrow(/future/);
  });
});
