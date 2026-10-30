import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CommsHubConnectionPanel } from "./CommsHubConnectionPanel";

afterEach(cleanup);

describe("Build 191 / QL-264 private decision and reversible TEST-only preview", () => {
  it("shows independent HOLD before any local check", () => {
    render(<CommsHubConnectionPanel />);
    expect(screen.getByText(/QL-264 private custody decision: HOLD/)).toBeInTheDocument();
    expect(screen.getByRole("status").textContent).toContain("Not run. Private relay remains OFF.");
    expect(screen.queryByRole("button", { name: /activate|install|send|connect now/i })).toBeNull();
  });

  it("labels local PASS as synthetic while proof B, reviewer, owner TEST and relay remain held", () => {
    render(<CommsHubConnectionPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Run local Comms Hub readiness check/ }));
    const report = JSON.parse(screen.getByRole("status").textContent ?? "{}");
    expect(report.localPass).toBe(true);
    expect(report.networkRequests).toBe(0);
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.activationEligible).toBe(false);
    expect(report.connectionGateDecision).toBe("HELD_PENDING_ORIGINAL_REVIEWER_PROOF_B_AND_OWNER_TEST");
    expect(report.originalReviewerReceipt).toBe("NOT_RECEIVED");
    expect(report.independentReviewerOrigin).toBe("NOT_VERIFIED");
    expect(report.signedProofB).toBe("NOT_VERIFIED");
    expect(report.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(report.ql264PrivateCustodyDecision).toBe("NOT_INDEPENDENTLY_AUTHENTICATED");
    expect(report.ql264OriginalPublicProofB).toBe("NOT_AVAILABLE");
    expect(report.remoteConnection).toBe("DISCONNECTED / HOLD");
    expect(report.windowsPrivateRelay).toBe("NOT_INSTALLED_OR_STARTED");
  });
  it("previews a bounded reversible TEST-only plan without connecting or approving anything", () => {
    render(<CommsHubConnectionPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Preview reversible TEST-only plan/ }));
    const preview = JSON.parse(screen.getByLabelText("QL-264 reversible TEST-only plan").textContent ?? "{}");
    expect(preview.simulated).toBe(true);
    expect(preview.networkRequests).toBe(0);
    expect(preview.methods).toEqual(["GET"]);
    expect(preview.proposedMaxMinutes).toBe(15);
    expect(preview.proposedMaxGets).toBe(9);
    expect(preview.proposedDenials).toHaveLength(7);
    expect(preview.activationEligible).toBe(false);
    expect(preview.rollback).toBe("PLAN_NOT_APPROVED_OR_EXECUTED");
    expect(preview.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(preview.remoteConnection).toBe("DISCONNECTED / HOLD");
  });
});
