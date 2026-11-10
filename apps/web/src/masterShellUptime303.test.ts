import { describe, expect, it } from "vitest";
import { buildMasterShellHandoff303, inspectMasterShellUptime303 } from "./masterShellUptime303";

const sha = "a".repeat(40);
const sample = {
  schema: "rosevear.ai-hub.master-shell-local-uptime.v1", sourceId: "rosevear-ai-hub",
  sourceRole: "SOURCE", expectedAutomationHost: "DESKTOP-AE894KC",
  collectionState: "MONITORING_LOCAL", scope: "LOCAL_LOOPBACK_AVAILABILITY_NOT_APPLICATION_HEALTH",
  sampleCount: 2, lastSampleAtUtc: "2026-11-10T17:00:00Z", processSessionSeconds: 120,
  services: ["hub_api", "hub_web", "caddy_proxy"].map(id => ({ id,
    check: "LOOPBACK_TCP_ONLY", state: "TCP_REACHABLE", reachableSamples: 2, sampleCount: 2 })),
  authenticatedShellTransport: "DISABLED", automatedExternalActions: 0, connection: "HOLD",
};

describe("Build 303 source uptime and Master handoff", () => {
  it("accepts only a source-owned HOLD read with three distinct known loopback services", () => {
    expect(inspectMasterShellUptime303(sample)?.sampleCount).toBe(2);
    expect(inspectMasterShellUptime303({ ...sample, connection: "CONNECTED" })).toBeNull();
    expect(inspectMasterShellUptime303({ ...sample, authenticatedShellTransport: "ENABLED" })).toBeNull();
    expect(inspectMasterShellUptime303({ ...sample, expectedAutomationHost: "TEMPLAR" })).toBeNull();
    expect(inspectMasterShellUptime303({ ...sample, services: [sample.services[0],
      sample.services[0], sample.services[2]] })).toBeNull();
  });
  it("exports sanitized two-plane reconciliation without promoting a receipt or connection", () => {
    const report = buildMasterShellHandoff303({ currentMainSha: sha,
      uptime: inspectMasterShellUptime303(sample),
      receiptCandidateState: "UNVERIFIED_CANDIDATE_HOLD",
      caseIssueCodes: ["SOURCE_SIGNER_MISSING", "SOURCE_SIGNER_MISSING"],
      nowMs: Date.parse("2026-11-10T17:00:00.000Z"), acknowledged: true })!;
    expect(report.monitoring.destination).toBe("ai-data-platform");
    expect(report.monitoring.loopbackSampleCount).toBe(2);
    expect(report.incidentOperations.destination).toBe("rosevear-comms-hub");
    expect(report.incidentOperations.issueCodes).toEqual(["SOURCE_SIGNER_MISSING"]);
    expect(report.oneReceiptPilot.acceptedReceipts).toBe(0);
    expect(report.oneReceiptPilot.ownerSupervisedOneTestAuthorized).toBe(false);
    expect(report.connection).toBe("HOLD");
    expect(report.published).toBe(false);
    expect(JSON.stringify(report)).not.toContain("privateKey");
  });
  it("refuses invalid source revisions, acknowledgement and untrusted exception codes", () => {
    const input = { currentMainSha: sha, uptime: null, receiptCandidateState: "BLOCKED_HOLD",
      caseIssueCodes: ["SOURCE_SIGNER_MISSING"], nowMs: 1, acknowledged: true };
    expect(buildMasterShellHandoff303({ ...input, acknowledged: false })).toBeNull();
    expect(buildMasterShellHandoff303({ ...input, currentMainSha: "wrong" })).toBeNull();
    expect(buildMasterShellHandoff303({ ...input, caseIssueCodes: ["PRIVATE=SECRET"] })).toBeNull();
    expect(buildMasterShellHandoff303({ ...input, nowMs: 9e15 })).toBeNull();
  });
});
