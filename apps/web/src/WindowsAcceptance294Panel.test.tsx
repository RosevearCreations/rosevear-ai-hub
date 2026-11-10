import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsAcceptance294Panel } from "./WindowsAcceptance294Panel";
import type { IntakeNote293 } from "./windowsEvidenceIntake293";

afterEach(() => cleanup());
const SHA = "a".repeat(40);
const note: IntakeNote293 = {
  reviewedAtUtc: "2026-11-09T21:59:00.000Z",
  source: "OWNER_SELECTED_UNSIGNED_HANDOFF_UNVERIFIED",
  digest: "c".repeat(64),
  reportedReleaseSha: SHA, reportedCheckoutSha: SHA, expectedMainSha: SHA,
  crossReference: "REPORTED_SOURCE_ALIGNMENT_UNVERIFIED", relatedEpisodeCount: 1,
  historicalSample: false, ownerReview: "ACKNOWLEDGED_LOCAL_REVIEW_ONLY",
  originalHostAcceptance: "HOLD_UNVERIFIED",
  receiptVerification: "HOLD_NOT_CRYPTOGRAPHICALLY_VERIFIED",
  masterShellAuthorization: "HOLD_UNVERIFIED", independentlyVerifiedGateCount: 0,
};

describe("Build 294 original Windows supervised acceptance and replay UI", () => {
  it("makes no external calls and requires a local Build 293 note and acknowledgement", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsAcceptance294Panel notes={[]} expectedMainSha={SHA} />);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Record supervised review plan locally/ })).toBeDisabled();
      expect(screen.getByText(/0 independently verified acceptances/)).toBeInTheDocument();
      expect(screen.getByRole("list", { name: /Independent Build 294 authority mapping/ })
        .querySelectorAll("li")).toHaveLength(7);
      expect(screen.queryByRole("button", { name: /publish|enroll signer|accept receipt/i })).toBeNull();
    } finally { fetchSpy.mockRestore(); }
  });
  it("records only an explicitly acknowledged browser note and runs synthetic scenarios", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsAcceptance294Panel notes={[note]} expectedMainSha={SHA} />);
      const record = screen.getByRole("button", { name: /Record supervised review plan locally/ });
      expect(record).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox", { name: /I understand this records an unverified browser note/ }));
      expect(record).toBeEnabled();
      fireEvent.click(record);
      expect(screen.getByText(/1 supervised owner note\(s\); 0 independently verified acceptances/)).toBeInTheDocument();
      expect(record).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: /Run synthetic replay test harness/ }));
      expect(screen.getByText(/8 synthetic scenarios; 0 verified signatures/)).toBeInTheDocument();
      expect(screen.getByText(/exact replay: would block replay/i)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
