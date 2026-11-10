import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsCustody295Panel } from "./WindowsCustody295Panel";
import { RECEIPT_VERIFICATION_GATES_293, type IntakeNote293 } from "./windowsEvidenceIntake293";
import type { SupervisedReview294 } from "./windowsSupervisedAcceptance294";

afterEach(() => cleanup());
const SHA = "a".repeat(40);
function context() {
  const now = Date.now();
  const intake: IntakeNote293 = {
    reviewedAtUtc: new Date(now - 120_000).toISOString(),
    source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED",
    digest: "b".repeat(64), reportedReleaseSha: SHA, reportedCheckoutSha: SHA,
    expectedMainSha: SHA, crossReference: "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED",
    relatedEpisodeCount: 1, historicalSample: false,
    ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY",
    originalHostAcceptance: "HOLD_UNVERIFIED",
    receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED",
    masterShellAuthorization: "HOLD_UNVERIFIED", independentlyVerifiedGateCount: 0,
  };
  const review: SupervisedReview294 = {
    reviewedAtUtc: new Date(now - 60_000).toISOString(),
    action: "REVIEW_ORIGINAL_HOST", expectedMainSha: SHA, linkedIntakeCount: 1,
    evidenceMapping: RECEIPT_VERIFICATION_GATES_293.map(gate => ({
      id: gate.id, authority: gate.authority,
      reviewState: "INDEPENDENT_REVIEW_REQUIRED" as const,
    })),
    ownerAcknowledgement: "LOCAL_NON_AUTHORIZING_ACKNOWLEDGEMENT",
    originalHostAccepted: false, signerWitnessVerified: false,
    receiptVerified: false, masterShellAuthorized: false,
  };
  return { intakeNotes: [intake], supervisedReviews: [review], expectedMainSha: SHA };
}
describe("Build 295 owner custody and handoff UI", () => {
  it("renders registry HOLD without network access and requires ordered owner action", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsCustody295Panel intakeNotes={[]} supervisedReviews={[]} expectedMainSha={SHA} />);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Record local custody note/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Simulate operator handoff/ })).toBeDisabled();
      expect(screen.getByRole("list", { name: /Build 295 independent evidence registry requirements/ })
        .querySelectorAll("li")).toHaveLength(7);
      expect(screen.getByText(/0 independently verified evidence records/)).toBeInTheDocument();
    } finally { fetchSpy.mockRestore(); }
  });
  it("records only owner-reported metadata and a blocked zero-send dry run", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsCustody295Panel {...context()} />);
      const custody = screen.getByRole("button", { name: /Record local custody note/ });
      expect(custody).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox", { name: /I acknowledge this records a local correlation note/ }));
      expect(custody).toBeEnabled();
      fireEvent.click(custody);
      expect(screen.getByText(/1 owner custody note\(s\); 0 independently verified evidence records/)).toBeInTheDocument();
      const handoff = screen.getByRole("button", { name: /Simulate operator handoff/ });
      expect(handoff).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox", { name: /I understand the simulated handoff is blocked/ }));
      fireEvent.click(handoff);
      expect(screen.getByText(/1 local handoff dry run\(s\); 0 messages sent/)).toBeInTheDocument();
      expect(screen.getByText(/blocked unverified original evidence; transport disabled/i)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
