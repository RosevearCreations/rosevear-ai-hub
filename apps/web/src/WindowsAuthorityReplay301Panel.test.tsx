import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsAuthorityReplay301Panel } from "./WindowsAuthorityReplay301Panel";
import { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";

afterEach(() => cleanup());
describe("Build 301 local protected intake UI", () => {
  it("displays all five missing authorities, blocks unacknowledged actions and never fetches", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      const report = reviewDecisionEvidence300({ packetRaw: "", reviewerRaw: "",
        decisionRaw: "", expectedMainSha: "a".repeat(40), observedMainSha: "",
        nowMs: Date.now() });
      render(<WindowsAuthorityReplay301Panel expectedMainSha={"a".repeat(40)}
        decisionReport={report} />);
      expect(screen.getByText(/Enrolled authorities: 0\/5/)).toBeInTheDocument();
      expect(screen.getByText(/PRIOR_DECISION_NOT_REVIEWABLE/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Simulate unsigned candidate/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Download sanitized Build 301/ })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: /Clear Build 301/ }));
      expect(screen.getByText(/Build 301 local receipt candidates/)).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});
