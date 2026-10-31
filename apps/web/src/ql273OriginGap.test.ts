import { describe, expect, it } from "vitest";
import { EMPTY_QL273_GAPS, makeQl273OriginGapDisposition } from "./ql273OriginGap";

describe("QL-273 source origin and custody gap action model", () => {
  it("anchors the actual immutable 404, with five unverified gates and zero GETs", () => {
    const report = makeQl273OriginGapDisposition({ ...EMPTY_QL273_GAPS });
    expect(report.immutableObservedMain).toBe("11861c13801b395d9be7f8a661fe7ebf8bc25fd5");
    expect(report.independentlyObservedOriginalSource).toBe("HTTP_404_NOT_FOUND");
    expect(report.evidenceGaps).toHaveLength(5);
    expect(report.evidenceGaps.every(gap => !gap.verified)).toBe(true);
    expect(report.verifiedGates).toBe(0);
    expect(report.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.activationEligible).toBe(false);
  });
  it("does not convert self-reported private evidence receipt into an authenticated witness", () => {
    const report = makeQl273OriginGapDisposition({
      original_publication: "owner_reports_return_received",
      commit_ancestry: "owner_reports_return_received",
      signer_pin: "owner_reports_return_received",
      reviewer_custody: "owner_reports_return_received",
      isolated_test: "owner_reports_return_received"
    });
    expect(report.evidenceGaps.every(gap => gap.disposition === "INDEPENDENT_VERIFICATION_REQUIRED")).toBe(true);
    expect(report.verifiedGates).toBe(0);
    expect(report.independentlyAuthenticatedSignerAndCustodian).toBe(false);
    expect(report.integration).toBe("DISCONNECTED / HOLD");
  });
  it("rejects arbitrary status from the local ledger instead of leaking it to export", () => {
    const report = makeQl273OriginGapDisposition({ ...EMPTY_QL273_GAPS, signer_pin: "approved_secret" as never });
    expect(report.evidenceGaps.find(gap => gap.gate === "signer_pin")?.reportedProgress).toBe("not_requested");
    expect(JSON.stringify(report)).not.toContain("approved_secret");
  });
});
