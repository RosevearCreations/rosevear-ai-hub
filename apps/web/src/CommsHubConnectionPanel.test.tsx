import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CommsHubConnectionPanel } from "./CommsHubConnectionPanel";

afterEach(cleanup);

describe("Build 190 / QL-263 Comms Hub decision alignment", () => {
  it("shows independent HOLD before any local check", () => {
    render(<CommsHubConnectionPanel />);
    expect(screen.getByText(/QL-263 independent decision: HOLD/)).toBeInTheDocument();
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
    expect(report.remoteConnection).toBe("DISCONNECTED / HOLD");
    expect(report.windowsPrivateRelay).toBe("NOT_INSTALLED_OR_STARTED");
  });
});
