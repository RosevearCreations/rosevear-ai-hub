import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsProtectedOperator302Panel } from "./WindowsProtectedOperator302Panel";
import { reviewDecisionEvidence300 } from "./windowsReviewerDecision300";
import { inspectReceiptCandidate301 } from "./windowsAuthorityReplay301";

afterEach(() => cleanup());
describe("Build 302 offline operator exception routing", () => {
  it("shows missing signature requirements, gates actions and never calls a network receiver", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      const sha = "a".repeat(40);
      const decision = reviewDecisionEvidence300({ packetRaw: "", reviewerRaw: "",
        decisionRaw: "", expectedMainSha: sha, observedMainSha: "", nowMs: Date.now() });
      const review = inspectReceiptCandidate301({ candidateRaw: "", expectedMainSha: sha,
        decision, prior: [], nowMs: Date.now() });
      render(<WindowsProtectedOperator302Panel expectedMainSha={sha} receiptReview={review} />);
      expect(screen.getByText(/ORIGINAL HOST BINDING/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Record local operator exception/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Download sanitized Build 302/ })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: /Clear Build 302 local exceptions/ }));
      expect(screen.getByText(/Build 302 local exception history cleared/)).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});
