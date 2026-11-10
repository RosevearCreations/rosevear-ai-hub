import { describe, expect, it } from "vitest";
import { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";
import {
  SIGNED_RECEIPT_REQUIREMENTS_302, ESCALATION_ROUTES_302,
  applicableEscalations302, exportOperatorEscalations302,
  operatorIntakeReview302, recordOperatorEscalation302,
} from "./windowsProtectedOperator302";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T16:00:00.000Z");
const decision = reviewDecisionEvidence300({ packetRaw: "", reviewerRaw: "",
  decisionRaw: "", observedMainSha: "", expectedMainSha: SHA, nowMs: NOW });
const report = inspectReceiptCandidate301({ candidateRaw: "", expectedMainSha: SHA,
  decision, prior: [], nowMs: NOW });

describe("Build 302 protected operator intake and original signed receipt contract", () => {
  it("states all independent signature requirements without accepting or enrolling anything", () => {
    const review = operatorIntakeReview302(report);
    expect(review.signingRequirements).toHaveLength(SIGNED_RECEIPT_REQUIREMENTS_302.length);
    expect(review.signingRequirements.every(r => r.state === "INDEPENDENT_PROOF_REQUIRED")).toBe(true);
    expect(review.independentlyVerifiedSigners).toBe(0);
    expect(review.enrolledReceivers).toBe(0);
    expect(review.acceptedReceipts).toBe(0);
    expect(review.authorizedToPublish).toBe(false);
    expect(review.connection).toBe("HOLD");
  });
  it("only offers observed replay/schema/drift exceptions when supported by source-side issues", () => {
    const offered = applicableEscalations302(report).map(r => r.issue);
    expect(offered).toContain("SOURCE_SIGNER_MISSING");
    expect(offered).not.toContain("REPLAY_SUSPECTED");
    expect(offered).not.toContain("RECEIPT_SCHEMA_REJECTED");
    expect(offered).not.toContain("SOURCE_REVISION_DRIFT");
    const observed = { ...report, issues: [...report.issues,
      "REPLAY_OR_COLLISION_DETECTED", "RECEIPT_SCHEMA_INVALID", "RECEIPT_SOURCE_MISMATCH"] as typeof report.issues };
    const observedRoutes = applicableEscalations302(observed).map(r => r.issue);
    expect(observedRoutes).toContain("REPLAY_SUSPECTED");
    expect(observedRoutes).toContain("RECEIPT_SCHEMA_REJECTED");
    expect(observedRoutes).toContain("SOURCE_REVISION_DRIFT");
  });
  it("requires explicit acknowledgement and refuses duplicate or invented case issues", () => {
    const base = { expectedMainSha: SHA, report, issue: "SOURCE_SIGNER_MISSING" as const,
      previous: [], acknowledged: true, nowMs: NOW };
    expect(recordOperatorEscalation302({ ...base, acknowledged: false })).toBeNull();
    expect(recordOperatorEscalation302({ ...base, expectedMainSha: "wrong" })).toBeNull();
    expect(recordOperatorEscalation302({ ...base, issue: "REPLAY_SUSPECTED" })).toBeNull();
    const first = recordOperatorEscalation302(base)!;
    expect(first.ownerRole).toBe("SOURCE_OWNER");
    expect(first.status).toBe("OPEN_HOLD");
    expect(first.messagesSent).toBe(0);
    expect(recordOperatorEscalation302({ ...base, previous: [first] })).toBeNull();
    const second = recordOperatorEscalation302({ ...base,
      issue: "RECEIVER_ENROLLMENT_MISSING", previous: [first] })!;
    expect(second.sequence).toBe(2);
    expect(second.ownerRole).toBe("SHELL_OPERATOR");
  });
  it("rejects forged prior case scope or excess history before export", () => {
    const first = recordOperatorEscalation302({ expectedMainSha: SHA, report,
      issue: "SIGNED_RECEIPT_MISSING", previous: [], acknowledged: true, nowMs: NOW })!;
    const request = { expectedMainSha: SHA, report, previous: [first],
      acknowledged: true, nowMs: NOW };
    expect(exportOperatorEscalations302({ ...request, acknowledged: false })).toBeNull();
    expect(exportOperatorEscalations302({ ...request, expectedMainSha: "wrong" })).toBeNull();
    expect(exportOperatorEscalations302({ ...request, previous: [{ ...first, sourceSha: "b".repeat(40) }] })).toBeNull();
    expect(exportOperatorEscalations302({ ...request, previous: Array(26).fill(first) })).toBeNull();
    expect(ESCALATION_ROUTES_302.length).toBeGreaterThan(6);
  });
  it("exports only a sanitized no-send HOLD exception handoff", () => {
    const first = recordOperatorEscalation302({ expectedMainSha: SHA, report,
      issue: "ORIGINAL_HOST_UNVERIFIED", previous: [], acknowledged: true, nowMs: NOW })!;
    const output = exportOperatorEscalations302({ expectedMainSha: SHA,
      report, previous: [first], acknowledged: true, nowMs: NOW })!;
    expect(output.connection).toBe("HOLD");
    expect(output.transport).toBe("DISABLED");
    expect(output.published).toBe(false);
    expect(output.cases[0].status).toBe("OPEN_HOLD");
    expect(output.signedReceiptVerified).toBe(false);
    expect(output.destinations).toEqual(["ai-data-platform", "rosevear-comms-hub"]);
    expect(JSON.stringify(output)).not.toContain("private-key");
  });
});
