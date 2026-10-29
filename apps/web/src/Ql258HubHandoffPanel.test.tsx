import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Ql258HubHandoffPanel } from "./Ql258HubHandoffPanel";
import { QL258_HUB_RELEASE, QL258_HUB_SNAPSHOT } from "./ql258HubHandoff";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const packet = () => JSON.stringify({ release: QL258_HUB_RELEASE, system: "rosevear-ai-hub",
  repository: "rosevear-ai-hub", publicGitHubSnapshot: {
    observed: "29 October 2026", mainSha: QL258_HUB_SNAPSHOT,
    requiredPath: "docs/integration/ql246-source-proof.json", httpStatusAtObservedSha: 404 },
  ownerReportedUnverifiedProgress: { privateCustodian: "OWNER_REPORTS_DONE_NOT_VERIFIED",
    independentWitness: "NOT_REPORTED", independentReviewer: "NOT_REPORTED",
    privateHost: "NOT_REPORTED", signerPresence: "NOT_REPORTED",
    outOfBandPin: "NOT_REPORTED", tenantIsolation: "NOT_APPLICABLE" },
  independentCustodyAuthenticated: false, sourceProofAccepted: false,
  ownerTestAuthorization: "NOT_GIVEN", authenticatedGatewayGets: 0,
  connection: "DISCONNECTED", livePilotHolds: 12,
  disposition: "OWNER_SELF_REPORT_ONLY_NOT_SECURITY_EVIDENCE_HELD" });

describe("Build 186 QL-258 local-only handoff UI", () => {
  it("requires valid original packet, displays unverified words and can clear without a network call", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<Ql258HubHandoffPanel />);
    expect(screen.getByRole("button", { name: /Review QL-258/ })).toBeDisabled();
    const input = screen.getByLabelText(/Sanitized JSON returned/) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "{\"privateKey\":\"no\"}" } });
    fireEvent.click(screen.getByRole("button", { name: /Review QL-258/ }));
    expect(screen.getByText(/Handoff rejected/)).toBeTruthy();
    fireEvent.change(input, { target: { value: packet() } });
    fireEvent.click(screen.getByRole("button", { name: /Review QL-258/ }));
    expect(screen.getByText(/1 of 6 applicable steps/)).toBeTruthy();
    expect(screen.getByText(/Sanitized owner self-report accepted/)).toBeTruthy();
    expect((screen.getByLabelText(/Safe local review result/) as HTMLTextAreaElement).value)
      .toContain('"connection": "DISCONNECTED / HOLD"');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Clear temporary packet/ }));
    expect(input.value).toBe("");
  });
});
