import { describe, expect, it } from "vitest";
import { prepareFieldPacket297 } from "./windowsFieldPacket297";
import { recordOwnerChecklist296 } from "./windowsCustodyReview296";
import { exportShellIntake300, reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T09:15:00.000Z");
const note: CustodyNote295 = {
  reviewedAtUtc: "2026-11-10T09:05:00.000Z",
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
  unsignedDigest: "b".repeat(64), localIntakeAtUtc: "2026-11-10T09:00:00.000Z",
  supervisedReviewAtUtc: "2026-11-10T09:02:00.000Z",
  supervisedAction: "REVIEW_ORIGINAL_HOST",
  linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
  verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
  physicalHostAccepted: false, cryptographicReceiptVerified: false,
  masterShellPublisherAuthorized: false,
};
const checklist = recordOwnerChecklist296({ note, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW - 60_000 })!;
const packet = prepareFieldPacket297({ note, checklist, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW })!;
const reviewer = {
  schema: "rosevear.ai-hub.original-host-reviewer-candidate.v1",
  sourceId: "rosevear-ai-hub", sourceSha: SHA, custodyDigestClaim: "b".repeat(64),
  reviewerReference: "CASE_299_A", reviewedAtUtc: "2026-11-10T09:15:01.000Z",
  evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY",
  independentIdentityState: "NOT_VERIFIED", signatureState: "NOT_VERIFIED",
  originalHostState: "NOT_VERIFIED", ownerConsentState: "NOT_VERIFIED",
};
const decision = {
  schema: "rosevear.ai-hub.reviewer-decision-candidate.v1",
  sourceId: "rosevear-ai-hub", sourceSha: SHA,
  reviewerReference: "CASE_299_A", decisionReference: "DECISION_300_A",
  decidedAtUtc: "2026-11-10T09:15:02.000Z",
  decision: "DEFER_PENDING_INDEPENDENT_EVIDENCE",
  evidenceOrigin: "OWNER_SUPPLIED_METADATA_ONLY",
  reviewerIdentityState: "NOT_VERIFIED", originalReceiptState: "NOT_VERIFIED",
  ownerConsentState: "NOT_VERIFIED", shellAuthority: "NOT_GRANTED", transport: "DISABLED",
};
const inspect = (options: Partial<Parameters<typeof reviewDecisionEvidence300>[0]> = {}) =>
  reviewDecisionEvidence300({ packetRaw: JSON.stringify(packet),
    reviewerRaw: JSON.stringify(reviewer), decisionRaw: JSON.stringify(decision),
    expectedMainSha: SHA, observedMainSha: SHA, nowMs: NOW + 3000, ...options });

describe("Build 300 reviewer decision and source revision recheck", () => {
  it("correlates a deferred candidate without accepting identity, receipt, consent or Shell authority", () => {
    const report = inspect();
    expect(report.state).toBe("CANDIDATE_DEFERRED_HOLD");
    expect(report.sourceRecheck).toBe("OWNER_REPORTED_MATCH_UNVERIFIED");
    expect(report.shellIntakeReadiness).toBe("READ_ONLY_PACKET_PREPARED_HOLD");
    expect(report.issues).toEqual(["INDEPENDENT_AUTHORITY_MISSING"]);
    expect(report.independentReviewerVerified).toBe(false);
    expect(report.authorizedToPublish).toBe(false);
    expect(report.messagesSent).toBe(0);
  });
  it("rejects missing, malformed, extra, trust-positive and identity-spoofed candidate fields", () => {
    expect(inspect({ decisionRaw: "" }).issues).toContain("DECISION_CANDIDATE_MISSING");
    for (const bad of [
      { ...decision, sourceId: "yw" },
      { ...decision, shellAuthority: "GRANTED" },
      { ...decision, originalReceiptState: "VERIFIED" },
      { ...decision, reviewerReference: "A Person" },
      { ...decision, extra: "secret" },
      { ...decision, decidedAtUtc: "2026-11-10" },
    ]) expect(inspect({ decisionRaw: JSON.stringify(bad) }).issues)
      .toContain("DECISION_SCHEMA_INVALID");
    expect(inspect({ decisionRaw: "A".repeat(4097) }).issues)
      .toContain("DECISION_SCHEMA_INVALID");
  });
  it("fails closed on current source drift, mismatched references, chronology and stale evidence", () => {
    const drift = inspect({ observedMainSha: "c".repeat(40) });
    expect(drift.sourceRecheck).toBe("REVISION_DRIFT_HOLD");
    expect(drift.issues).toContain("SOURCE_REVISION_DRIFT");
    expect(drift.shellIntakeReadiness).toBe("BLOCKED_HOLD");
    expect(inspect({ observedMainSha: "" }).issues).toContain("SOURCE_REVISION_UNAVAILABLE");
    expect(inspect({ decisionRaw: JSON.stringify({ ...decision, sourceSha: "c".repeat(40) }) })
      .issues).toContain("DECISION_SOURCE_MISMATCH");
    expect(inspect({ decisionRaw: JSON.stringify({ ...decision, reviewerReference: "OTHER_CASE" }) })
      .issues).toContain("DECISION_REVIEWER_MISMATCH");
    expect(inspect({ decisionRaw: JSON.stringify({ ...decision,
      decidedAtUtc: "2026-11-10T09:14:00.000Z" }) }).issues)
      .toContain("DECISION_CHRONOLOGY_INVALID");
    expect(inspect({ nowMs: NOW + 31 * 60_000 }).issues)
      .toContain("PROVENANCE_NOT_CORRELATED");
  });
  it("treats explicit reviewer rejection as blocked even when metadata correlates", () => {
    const report = inspect({ decisionRaw: JSON.stringify({ ...decision, decision: "REJECT_CANDIDATE" }) });
    expect(report.state).toBe("CANDIDATE_REJECTED_HOLD");
    expect(report.shellIntakeReadiness).toBe("BLOCKED_HOLD");
  });
  it("exports a sanitized read-only HOLD status only with owner acknowledgement", () => {
    const report = inspect();
    const fields = { report, expectedMainSha: SHA, nowMs: NOW + 3000, acknowledged: true };
    expect(exportShellIntake300({ ...fields, acknowledged: false })).toBeNull();
    expect(exportShellIntake300({ ...fields, expectedMainSha: "wrong" })).toBeNull();
    const output = exportShellIntake300(fields)!;
    expect(output.connection).toBe("HOLD");
    expect(output.published).toBe(false);
    expect(output.transport).toBe("DISABLED");
    expect(output.destinations).toEqual(["ai-data-platform", "rosevear-comms-hub"]);
    const serialized = JSON.stringify(output);
    expect(serialized).not.toContain("DECISION_300_A");
    expect(serialized).not.toContain("CASE_299_A");
    expect(serialized).not.toContain("b".repeat(64));
  });
});
