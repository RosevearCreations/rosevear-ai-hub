/** Build 183: read-only continuity of Build 182 private HOLD reassessments, not an external attestation. */
import type { ReassessmentNote } from "./ownerRecurrenceReassessment";

export interface Ql256RenewalContinuity {
  reassessments_reviewed: number;
  unique_case_watch_pairs: number;
  repeated_original_source_gaps: number;
  aging_over_seven_days: number;
  newest_private_note_at: string | null;
  current_private_status: "RECHECK_REQUIRED" | "NO_PRIVATE_REASSESSMENTS";
  original_source_ci: "SEPARATE_PUBLIC_PROVENANCE_REQUIRED";
  actual_signer_provisioning: "SIGNER_STATUS_UNKNOWN";
  trusted_custodian_and_witness: "PRIVATE_ASSIGNMENT_REQUIRED";
  original_signed_proof_B: "NOT_AVAILABLE";
  owner_test_decision: "NOT_GIVEN";
  actual_gateway_get_receipts: "NOT_RUN";
  relay_installation: "NO";
  connection_state: "DISCONNECTED";
  next_action: "ASSIGN_PRIVATE_SIGNER_CUSTODIAN_AND_DISTINCT_WITNESS";
}

export function summarizeQl256Continuity(notes: readonly ReassessmentNote[], now = new Date().toISOString()): Ql256RenewalContinuity {
  const at = Date.parse(now);
  if (!Number.isFinite(at) || at > Date.now() + 300_000 || at < Date.parse("2020-01-01T00:00:00Z"))
    throw new Error("QL-256 continuity needs a valid current observation time.");
  const pairs = new Set<string>();
  let repeated = 0;
  let aged = 0;
  let newest = -Infinity;
  for (const note of notes) {
    const time = Date.parse(note.recorded_at);
    if (!Number.isFinite(time) || time > at || note.state !== "PRIVATE_RECURRENCE_REASSESSMENT_NOT_SENT")
      throw new Error("QL-256 continuity cannot upgrade a future or non-HOLD private note.");
    pairs.add(`${note.case_id}:${note.reassignment_watch_index}`);
    if (note.persistent_original_gap) repeated++;
    if (at - time > 7 * 86_400_000) aged++;
    newest = Math.max(newest, time);
  }
  return {
    reassessments_reviewed: notes.length,
    unique_case_watch_pairs: pairs.size,
    repeated_original_source_gaps: repeated,
    aging_over_seven_days: aged,
    newest_private_note_at: Number.isFinite(newest) ? new Date(newest).toISOString() : null,
    current_private_status: notes.length ? "RECHECK_REQUIRED" : "NO_PRIVATE_REASSESSMENTS",
    original_source_ci: "SEPARATE_PUBLIC_PROVENANCE_REQUIRED",
    actual_signer_provisioning: "SIGNER_STATUS_UNKNOWN",
    trusted_custodian_and_witness: "PRIVATE_ASSIGNMENT_REQUIRED",
    original_signed_proof_B: "NOT_AVAILABLE",
    owner_test_decision: "NOT_GIVEN", actual_gateway_get_receipts: "NOT_RUN",
    relay_installation: "NO", connection_state: "DISCONNECTED",
    next_action: "ASSIGN_PRIVATE_SIGNER_CUSTODIAN_AND_DISTINCT_WITNESS",
  };
}
