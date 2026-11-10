import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsSupervisedPilot303Panel } from "./WindowsSupervisedPilot303Panel";
import { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";

afterEach(() => cleanup());
describe("Build 303 supervised pilot and two-plane reconciliation", () => {
  it("requires acknowledgement, leaves receiver OFF and never imports an original receipt", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      const sha = "a".repeat(40);
      const decision = reviewDecisionEvidence300({ packetRaw: "", reviewerRaw: "",
        decisionRaw: "", expectedMainSha: sha, observedMainSha: "", nowMs: Date.now() });
      const review = inspectReceiptCandidate301({ candidateRaw: "", expectedMainSha: sha,
        decision, prior: [], nowMs: Date.now() });
      render(<WindowsSupervisedPilot303Panel expectedMainSha={sha}
        receiptReview={review} cases={[]} />);
      expect(screen.getByText(/One original source-signed receipt has not been independently verified/)).toBeInTheDocument();
      expect(screen.getByText(/AI Data HOLD; Comms receiver OFF/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download Master Shell one-receipt/ })).toBeDisabled();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});
