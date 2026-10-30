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
  it("rejects unsafe pasted public decisions and exports only fixed HOLD statuses", () => {
    render(<CommsHubConnectionPanel />);
    const input = screen.getByRole("textbox", { name: /Sanitized public status JSON/ });
    fireEvent.change(input, { target: { value: '{"ownerTestAuthorization":"GIVEN","password":"PRIVATE"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Validate and prepare sanitized Hub handoff/ }));
    expect(input).toHaveValue("");
    const packet = JSON.parse(screen.getByLabelText("QL-267 sanitized Hub handoff").textContent ?? "{}");
    expect(packet.ql264OriginalPublicDecisionIntake).toBe("REJECTED_UNTRUSTED_OR_MALFORMED");
    expect(packet.activationEligible).toBe(false);
    expect(packet.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(packet.authenticatedGatewayGets).toBe(0);
    expect(JSON.stringify(packet)).not.toContain("PRIVATE");
    expect(screen.getByRole("button", { name: /Copy sanitized Hub handoff/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Clear in-memory handoff/ }));
    expect(screen.getByLabelText("QL-267 sanitized Hub handoff").textContent)
      .toContain("No handoff prepared");
    expect(screen.getByLabelText("QL-267 public decision intake status")).toHaveTextContent("NOT_RECEIVED");
  });

  it("keeps QL-267 copy restricted to the sanitized current in-memory export", () => {
    render(<CommsHubConnectionPanel />);
    expect(screen.getByRole("button", { name: /Copy sanitized Hub handoff/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Validate and prepare sanitized Hub handoff/ }));
    const packet = JSON.parse(screen.getByLabelText("QL-267 sanitized Hub handoff").textContent ?? "{}");
    expect(packet.ql264OriginalPublicDecisionIntake).toBe("NOT_RECEIVED");
    expect(packet.originalSignedProofB).toBe("NOT_AVAILABLE");
    expect(packet.conditionalTestSlot).toBe("HELD_UNSCHEDULED");
    expect(packet.windowsPrivateRelay).toBe("NOT_INSTALLED_OFF");
    expect(packet.livePilotHolds).toBe(12);
  });
});

describe("Build 193 / QL-268 offline source-proof publication exception", () => {
  it("rejects public self-report with secret fields, clears raw input and leaves GET/relay blocked", () => {
    render(<CommsHubConnectionPanel />);
    const input = screen.getByRole("textbox", { name: /Optional QL-268 public proof metadata JSON/ });
    fireEvent.change(input, { target: { value: '{"private_key":"SHOULD_NEVER_LEAVE_PANEL"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Screen public proof metadata/ }));
    expect(input).toHaveValue("");
    expect(screen.getByLabelText("QL-268 public proof metadata status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const audit = JSON.parse(screen.getByLabelText("QL-268 sanitized proof exception audit").textContent ?? "{}");
    expect(audit.claimedProofB).toBeNull();
    expect(audit.originalProofAtObservedMain).toBe("HTTP_404");
    expect(audit.ownerTestAuthorization).toBe("NOT_GIVEN");
    expect(audit.authenticatedGatewayGets).toBe(0);
    expect(audit.windowsPrivateRelay).toBe("NOT_INSTALLED_OFF");
    expect(audit.integration).toBe("DISCONNECTED / HOLD");
    expect(JSON.stringify(audit)).not.toContain("SHOULD_NEVER_LEAVE_PANEL");
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-268 memory" }));
    expect(screen.getByLabelText("QL-268 public proof metadata status")).toHaveTextContent("NOT_RECEIVED");
  });
});
