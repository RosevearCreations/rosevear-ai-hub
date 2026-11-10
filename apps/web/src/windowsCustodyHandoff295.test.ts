import { describe, expect, it } from "vitest";
import type { IntakeNote293 } from "./windowsEvidenceIntake293";
import { RECEIPT_VERIFICATION_GATES_293 } from "./windowsEvidenceIntake293";
import type { SupervisedReview294 } from "./windowsSupervisedAcceptance294";
import { EVIDENCE_REGISTRY_GATES_295, evidenceRegistryInterface295,
  exportCustody295, recordCustodyReview295, runHandoffDryRun295 } from "./windowsCustodyHandoff295";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T01:20:00.000Z");
const intake: IntakeNote293 = {
  reviewedAtUtc: "2026-11-10T01:10:00.000Z",
  source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED", digest: "b".repeat(64),
  reportedReleaseSha: SHA, reportedCheckoutSha: SHA, expectedMainSha: SHA,
  crossReference: "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED", relatedEpisodeCount: 1,
  historicalSample: false, ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY",
  originalHostAcceptance: "HOLD_UNVERIFIED",
  receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED",
  masterShellAuthorization: "HOLD_UNVERIFIED", independentlyVerifiedGateCount: 0,
};
const supervised: SupervisedReview294 = {
  reviewedAtUtc: "2026-11-10T01:15:00.000Z", action: "REVIEW_ORIGINAL_HOST",
  expectedMainSha: SHA, linkedIntakeCount: 1,
  evidenceMapping: RECEIPT_VERIFICATION_GATES_293.map(gate => ({
    id: gate.id, authority: gate.authority, reviewState: "INDEPENDENT_REVIEW_REQUIRED" as const,
  })),
  ownerAcknowledgement: "LOCAL_NON_AUTHORIZING_ACKNOWLEDGEMENT",
  originalHostAccepted: false, signerWitnessVerified: false,
  receiptVerified: false, masterShellAuthorized: false,
};
const input = { intakeNotes: [intake], supervisedReviews: [supervised],
  expectedMainSha: SHA, acknowledged: true, nowMs: NOW };

describe("Build 295 fail-closed custody review", () => {
  it("demands explicit acknowledgement and both earlier unverified note stages", () => {
    expect(recordCustodyReview295({ ...input, acknowledged: false })).toEqual({
      state: "REJECTED", reason: "OWNER_ACKNOWLEDGEMENT_REQUIRED",
    });
    expect(recordCustodyReview295({ ...input, intakeNotes: [] })).toEqual({
      state: "REJECTED", reason: "NO_VALID_LOCAL_INTAKE",
    });
    expect(recordCustodyReview295({ ...input, supervisedReviews: [] })).toEqual({
      state: "REJECTED", reason: "NO_VALID_SUPERVISED_REVIEW",
    });
    expect(recordCustodyReview295({ ...input, expectedMainSha: "oops" }).state).toBe("REJECTED");
    expect(recordCustodyReview295({ ...input, nowMs: Number.NaN }).state).toBe("REJECTED");
  });
  it("rejects mismatched order, future claims and trust-positive inputs", () => {
    expect(recordCustodyReview295({ ...input, supervisedReviews: [{
      ...supervised, reviewedAtUtc: "2026-11-10T01:00:00.000Z",
    }] }).state).toBe("REJECTED");
    expect(recordCustodyReview295({ ...input, intakeNotes: [{
      ...intake, reviewedAtUtc: "2030-01-01T00:00:00.000Z",
    }] }).state).toBe("REJECTED");
    expect(recordCustodyReview295({ ...input, supervisedReviews: [{
      ...supervised, receiptVerified: true,
    } as unknown as SupervisedReview294] }).state).toBe("REJECTED");
    expect(recordCustodyReview295({ ...input, intakeNotes: [{
      ...intake, expectedMainSha: "c".repeat(40),
    }] }).state).toBe("REJECTED");
  });
  it("creates only correlation metadata, without inventing registry authority", () => {
    const result = recordCustodyReview295(input);
    expect(result.state).toBe("OWNER_CUSTODY_NOTE_ONLY");
    if (result.state !== "OWNER_CUSTODY_NOTE_ONLY") return;
    expect(result.note.linkage).toBe("SOURCE_AND_TIME_CORRELATION_ONLY");
    expect(result.note.physicalHostAccepted).toBe(false);
    const registry = evidenceRegistryInterface295(result.note);
    expect(registry.connection).toBe("NOT_CONNECTED");
    expect(registry.requirements).toHaveLength(7);
    expect(registry.independentVerifiedCount).toBe(0);
    expect(registry.writesEnabled).toBe(false);
    expect(EVIDENCE_REGISTRY_GATES_295).toHaveLength(7);
  });
  it("operator-gates the simulated handoff and blocks all real sends", () => {
    const result = recordCustodyReview295(input);
    if (result.state !== "OWNER_CUSTODY_NOTE_ONLY") throw Error("missing custody");
    const request = { note: result.note, expectedMainSha: SHA,
      destination: "AI_DATA_PLATFORM_READ_ONLY_REVIEW" as const,
      acknowledged: true, nowMs: NOW + 1000 };
    expect(runHandoffDryRun295({ ...request, acknowledged: false })).toBeNull();
    expect(runHandoffDryRun295({ ...request, expectedMainSha: "c".repeat(40) })).toBeNull();
    const dry = runHandoffDryRun295(request);
    expect(dry?.decision).toBe("BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE");
    expect(dry?.messagesSent).toBe(0);
    expect(dry?.transport).toBe("DISABLED");
    expect(dry?.masterShellAuthorized).toBe(false);
    const report = exportCustody295(Array(12).fill(result.note), Array(12).fill(dry!));
    expect(report.notes).toHaveLength(10);
    expect(report.dryRuns).toHaveLength(10);
    expect(report.registeredEvidence).toBe(0);
  });
});
