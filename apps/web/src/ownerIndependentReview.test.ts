import { describe, expect, it } from "vitest";
import { createTrialReceipt, recordTrialObservation, type TrialEnvironment } from "./ownerFieldTrial";
import { advanceRepairHandoff, createReconciliationReceipt, createRepairHandoff } from "./ownerTrialReconciliation";
import {
  REVIEW_CRITERIA, assessIndependentEvidence, createIndependentReviewReceipt,
  parseIndependentReviewReceipt, recordIndependentEvidence,
  type ReviewEvidenceEvent,
} from "./ownerIndependentReview";

const env: TrialEnvironment = { installed_version: "0.0.4-build150", access: "local_console", installed_windows_witnessed: true };
const unknown: TrialEnvironment = { installed_version: "", access: "unknown", installed_windows_witnessed: false };
const times = Array.from({ length: 20 }, (_, i) => `2026-10-25T${String(i + 1).padStart(2, "0")}:00:00.000Z`);

function prepared(withPass = true) {
  let history = recordTrialObservation([], unknown, { case_id: "windows", outcome: "issue", finding: "startup",
    next_owner: "household_owner", witnessed: true }, times[0]);
  let handoffs = createRepairHandoff(history, [], "windows", times[1]);
  handoffs = advanceRepairHandoff(history, handoffs, "windows", 0, true, times[2]);
  handoffs = advanceRepairHandoff(history, handoffs, "windows", 0, true, times[3]);
  if (withPass) history = recordTrialObservation(history, env, { case_id: "windows", outcome: "passed",
    finding: "none", next_owner: "household_owner", witnessed: true }, times[4]);
  return { history, handoffs };
}

describe("Build 150 conditional closure readiness and evidence gap register", () => {
  it("requires a prepared exact handoff and a separate witnessed review without inferring any field acceptance", () => {
    expect(REVIEW_CRITERIA).toHaveLength(7);
    const { history, handoffs } = prepared(false);
    expect(assessIndependentEvidence(history, handoffs[0], [], env)).toMatchObject({
      present_claimed: 0, gaps: 7, packet_readiness: "EVIDENCE_GAPS_HOLD",
      field_acceptance: "FIELD_ACCEPTANCE_HOLD", conditional_closure: "NOT_AUTHORIZED" });
    expect(() => recordIndependentEvidence(history, handoffs, [], env, { case_id: "windows", baseline_index: 0,
      criterion: "original_finding", state: "gap", reviewer_witnessed: false, separate_reviewer: false }, times[5])).toThrow(/personally witness/);
    expect(() => recordIndependentEvidence(history, handoffs, [], env, { case_id: "windows", baseline_index: 0,
      criterion: "current_retest", state: "present_claimed", reviewer_witnessed: true, separate_reviewer: false }, times[5])).toThrow(/later owner-observed pass/);
  });

  it("keeps missing, contradiction and staleness explicit when the source case changes", () => {
    const { history, handoffs } = prepared();
    const entry = { case_id: "windows" as const, baseline_index: 0, criterion: "identity_match" as const,
      state: "contradiction" as const, reviewer_witnessed: true, separate_reviewer: false };
    const events = recordIndependentEvidence(history, handoffs, [], env, entry, times[5]);
    expect(assessIndependentEvidence(history, handoffs[0], events, env).criteria.find(i => i.id === "identity_match")?.status).toBe("contradiction");
    const next = recordTrialObservation(history, unknown, { case_id: "windows", outcome: "blocked",
      finding: "startup", next_owner: "household_owner", witnessed: true }, times[6]);
    expect(assessIndependentEvidence(next, handoffs[0], events, env).criteria.find(i => i.id === "identity_match")?.status).toBe("stale");
    expect(assessIndependentEvidence(history, handoffs[0], events, env, events.length).criteria.find(i => i.id === "identity_match")?.status).toBe("imported_historical");
  });

  it("does not clear a contradictory source by checking present again against the same observation", () => {
    const { history, handoffs } = prepared();
    let events = recordIndependentEvidence(history, handoffs, [], env,
      { case_id: "windows", baseline_index: 0, criterion: "identity_match", state: "contradiction",
        reviewer_witnessed: true, separate_reviewer: false }, times[5]);
    for (const [i, item] of REVIEW_CRITERIA.entries()) events = recordIndependentEvidence(history, handoffs, events, env,
      { case_id: "windows", baseline_index: 0, criterion: item.id, state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: item.id === "independent_witness" }, times[i + 6]);
    expect(assessIndependentEvidence(history, handoffs[0], events, env)).toMatchObject({
      present_claimed: 7, unresolved_contradictions: 1, packet_readiness: "EVIDENCE_GAPS_HOLD", conditional_closure: "NOT_AUTHORIZED" });
  });

  it("never authorizes closure even after all seven reviewer-present claims are recorded", () => {
    const { history, handoffs } = prepared();
    let events: ReviewEvidenceEvent[] = [];
    for (const [i, criterion] of REVIEW_CRITERIA.entries()) {
      events = recordIndependentEvidence(history, handoffs, events, env,
        { case_id: "windows", baseline_index: 0, criterion: criterion.id, state: "present_claimed",
          reviewer_witnessed: true, separate_reviewer: criterion.id === "independent_witness" }, times[i + 5]);
    }
    expect(assessIndependentEvidence(history, handoffs[0], events, env)).toMatchObject({
      present_claimed: 7, gaps: 0, packet_readiness: "REVIEW_PACKET_PREPARED_ONLY",
      conditional_closure: "NOT_AUTHORIZED", field_acceptance: "FIELD_ACCEPTANCE_HOLD" });
    expect(assessIndependentEvidence(history, handoffs[0], events, env, events.length)).toMatchObject({
      present_claimed: 0, gaps: 7, packet_readiness: "EVIDENCE_GAPS_HOLD" });
    const receipt = createIndependentReviewReceipt(env, [], history, handoffs, events, times[15]);
    expect(receipt).toMatchObject({ conditional_closure: "NOT_AUTHORIZED", field_acceptance: "FIELD_ACCEPTANCE_HOLD",
      evidence_authenticity: "UNVERIFIED_OPERATOR_ATTESTATIONS" });
    expect(parseIndependentReviewReceipt(JSON.stringify(receipt))).toEqual({ trial: receipt.reconciliation.trial,
      handoffs, events });
  });

  it("requires an explicit different reviewer claim for the reviewer criterion", () => {
    const { history, handoffs } = prepared();
    expect(() => recordIndependentEvidence(history, handoffs, [], env,
      { case_id: "windows", baseline_index: 0, criterion: "independent_witness", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, times[5])).toThrow(/separate reviewer/);
    expect(() => recordIndependentEvidence(history, handoffs, [], unknown,
      { case_id: "windows", baseline_index: 0, criterion: "installed_windows", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, times[5])).toThrow(/actual installed Windows/);
  });

  it("refuses to reclassify an imported historical owner pass as a current retest without a new observation", () => {
    const { history, handoffs } = prepared();
    expect(() => recordIndependentEvidence(history, handoffs, [], env,
      { case_id: "windows", baseline_index: 0, criterion: "current_retest", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, times[5], history.length)).toThrow(/Imported historical retests/);
    const events = recordIndependentEvidence(history, handoffs, [], env,
      { case_id: "windows", baseline_index: 0, criterion: "original_finding", state: "present_claimed",
        reviewer_witnessed: true, separate_reviewer: false }, times[5]);
    expect(assessIndependentEvidence(history, handoffs[0], events, env, 0, history.length).packet_readiness).toBe("EVIDENCE_GAPS_HOLD");
  });

  it("imports previous Build 148/149 receipts with zero fresh reviewer evidence", () => {
    const { history, handoffs } = prepared();
    const legacy = createTrialReceipt(env, [], history, times[15]);
    const reconciled = createReconciliationReceipt(env, [], history, handoffs, times[15]);
    expect(parseIndependentReviewReceipt(JSON.stringify(legacy))).toEqual({ trial: legacy, handoffs: [], events: [] });
    expect(parseIndependentReviewReceipt(JSON.stringify(reconciled))).toEqual({ trial: reconciled.trial, handoffs, events: [] });
  });

  it("rejects fabricated closure, unknown fields, mismatched source pointers and false reviewer identity", () => {
    const { history, handoffs } = prepared();
    const events = recordIndependentEvidence(history, handoffs, [], env, { case_id: "windows", baseline_index: 0,
      criterion: "original_finding", state: "gap", reviewer_witnessed: true, separate_reviewer: false }, times[5]);
    const receipt = createIndependentReviewReceipt(env, [], history, handoffs, events, times[15]);
    expect(() => parseIndependentReviewReceipt(JSON.stringify({ ...receipt, conditional_closure: "GREEN" }))).toThrow(/unsafe closure/);
    expect(() => parseIndependentReviewReceipt(JSON.stringify({ ...receipt, review_events: [{ ...events[0], hostname: "private-host" }] }))).toThrow(/unsafe independent/);
    expect(() => parseIndependentReviewReceipt(JSON.stringify({ ...receipt, review_events: [{ ...events[0], source_observation_index: 991 }] }))).toThrow(/exact trial baseline/);
    expect(() => parseIndependentReviewReceipt(JSON.stringify({ ...receipt, review_events: [{ ...events[0], separate_reviewer_attested: true }] }))).toThrow(/exact trial baseline/);
    expect(() => parseIndependentReviewReceipt(JSON.stringify({ ...receipt, review_events: [null] }))).toThrow(/unsafe independent/);
  });
});
