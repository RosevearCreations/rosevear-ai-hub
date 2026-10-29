import { describe, expect, it } from "vitest";
import { inspectQl258HubHandoff, QL258_HUB_RELEASE, QL258_HUB_SNAPSHOT } from "./ql258HubHandoff";

function packet() {
  return { release: QL258_HUB_RELEASE, system: "rosevear-ai-hub", repository: "rosevear-ai-hub",
    publicGitHubSnapshot: { observed: "29 October 2026", mainSha: QL258_HUB_SNAPSHOT,
      requiredPath: "docs/integration/ql246-source-proof.json", httpStatusAtObservedSha: 404 },
    ownerReportedUnverifiedProgress: { privateCustodian: "NOT_REPORTED", independentWitness: "NOT_REPORTED",
      independentReviewer: "NOT_REPORTED", privateHost: "NOT_REPORTED", signerPresence: "NOT_REPORTED",
      outOfBandPin: "NOT_REPORTED", tenantIsolation: "NOT_APPLICABLE" },
    independentCustodyAuthenticated: false, sourceProofAccepted: false,
    ownerTestAuthorization: "NOT_GIVEN", authenticatedGatewayGets: 0,
    connection: "DISCONNECTED", livePilotHolds: 12,
    disposition: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD" };
}

describe("Build 186 genuine Comms Hub QL-258 status-only packet", () => {
  it("accepts only original dated historical 404 and keeps everything HELD", () => {
    const r = inspectQl258HubHandoff(JSON.stringify(packet()));
    expect(r.snapshot_is_historical_not_current_main).toBe(true);
    expect(r.reported_done_not_verified).toBe(0);
    expect(r.owner_test_authorization).toBe("NOT_GIVEN");
    expect(r.authenticated_gateway_GETs).toBe(0);
    expect(r.independently_authenticated_roles_or_keys).toBe(false);
    expect(r.original_signed_source_proof_B).toBe("NOT_AVAILABLE");
    expect(r.connection).toBe("DISCONNECTED / HOLD");
  });
  it("owner-reported completion is not proof or a trust upgrade", () => {
    const p = packet(); p.ownerReportedUnverifiedProgress.privateCustodian = "OWNER_REPORTS_DONE_NOT_VERIFIED";
    p.ownerReportedUnverifiedProgress.independentWitness = "OWNER_REPORTS_IN_PROGRESS";
    const r = inspectQl258HubHandoff(JSON.stringify(p));
    expect(r.reported_done_not_verified).toBe(1);
    expect(r.independently_authenticated_roles_or_keys).toBe(false);
    expect(r.connection).toBe("DISCONNECTED / HOLD");
  });
  it("rejects credential extras, PII, forged TEST approval, connected state, and tenant claims", () => {
    const p: Record<string, unknown> = packet(); p.privateKey = "DO_NOT_INCLUDE";
    expect(() => inspectQl258HubHandoff(JSON.stringify(p))).toThrow();
    delete p.privateKey;
    const q = p as ReturnType<typeof packet>;
    q.ownerReportedUnverifiedProgress.privateHost = "private C:\\secrets\\key";
    expect(() => inspectQl258HubHandoff(JSON.stringify(q))).toThrow();
    q.ownerReportedUnverifiedProgress.privateHost = "NOT_REPORTED";
    q.ownerTestAuthorization = "GIVEN";
    expect(() => inspectQl258HubHandoff(JSON.stringify(q))).toThrow();
    q.ownerTestAuthorization = "NOT_GIVEN";
    q.connection = "CONNECTED";
    expect(() => inspectQl258HubHandoff(JSON.stringify(q))).toThrow();
    q.connection = "DISCONNECTED";
    q.ownerReportedUnverifiedProgress.tenantIsolation = "OWNER_REPORTS_DONE_NOT_VERIFIED";
    expect(() => inspectQl258HubHandoff(JSON.stringify(q))).toThrow();
  });
  it("rejects another app's packet and a stale snapshot passed off as a new source check", () => {
    const p = packet(); p.system = "icamp";
    expect(() => inspectQl258HubHandoff(JSON.stringify(p))).toThrow();
    p.system = "rosevear-ai-hub";
    p.publicGitHubSnapshot.mainSha = "8d6faa77d7a44f8f97cd51d0acd209fe00b2c32c";
    expect(() => inspectQl258HubHandoff(JSON.stringify(p))).toThrow();
  });
});
