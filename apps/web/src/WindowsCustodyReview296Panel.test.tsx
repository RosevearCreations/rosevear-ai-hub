import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsCustodyReview296Panel } from "./WindowsCustodyReview296Panel";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

afterEach(() => cleanup());
const SHA = "a".repeat(40);
function noteNow(): CustodyNote295 {
  const now = Date.now();
  return {
    reviewedAtUtc: new Date(now - 30_000).toISOString(),
    source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
    unsignedDigest: "b".repeat(64),
    localIntakeAtUtc: new Date(now - 120_000).toISOString(),
    supervisedReviewAtUtc: new Date(now - 60_000).toISOString(),
    supervisedAction: "REVIEW_ORIGINAL_HOST",
    linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
    authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
    verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
    physicalHostAccepted: false, cryptographicReceiptVerified: false,
    masterShellPublisherAuthorized: false,
  };
}
describe("Build 296 owner exception checklist and readiness UI", () => {
  it("is offline and fail-closed without custody notes", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsCustodyReview296Panel custodyNotes={[]} dryRuns={[]} expectedMainSha={SHA} />);
      expect(spy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Record open custody exception/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Record owner field-review checklist/ })).toBeDisabled();
      expect(screen.getByRole("list", { name: /Build 296 field receipt independent checklist/ })
        .querySelectorAll("li")).toHaveLength(7);
      expect(screen.getByText(/READ-ONLY DESIGN PREVIEW — NOT PUBLISHED/)).toBeInTheDocument();
    } finally { spy.mockRestore(); }
  });
  it("records only explicit local OPEN exceptions and review-only checklists", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsCustodyReview296Panel custodyNotes={[noteNow()]} dryRuns={[]} expectedMainSha={SHA} />);
      const exception = screen.getByRole("button", { name: /Record open custody exception/ });
      fireEvent.click(screen.getByRole("checkbox", { name: /I understand this records an OPEN/ }));
      fireEvent.click(exception);
      expect(screen.getByText(/1 open browser-session exception note\(s\); 0 verified closures/)).toBeInTheDocument();
      const checklist = screen.getByRole("button", { name: /Record owner field-review checklist/ });
      fireEvent.click(screen.getByRole("checkbox", { name: /I approve this checklist for future field REVIEW ONLY/ }));
      fireEvent.click(checklist);
      expect(screen.getByText(/1 checklist review note\(s\); 0 field receipts accepted/)).toBeInTheDocument();
      expect(screen.getByText(/NOT CONNECTED/)).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});
