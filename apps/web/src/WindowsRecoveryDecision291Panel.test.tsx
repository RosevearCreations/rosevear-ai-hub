import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type { WindowsAdoptionReview290 } from "./windowsFieldAdoption290";
import { WindowsRecoveryDecision291Panel } from "./WindowsRecoveryDecision291Panel";

afterEach(() => cleanup());

const SHA = "a".repeat(40);
const review: WindowsAdoptionReview290 = {
  disposition: "REPORTED_DRIFT_NEEDS_REVIEW", referenceState: "OWNER_ENTERED_UNVERIFIED",
  axes: [], matchCount: 3, backendVersion: "0.0.57",
  backendVersionState: "VERSION_DISAGREEMENT",
  runtimeState: "LIVE_WINDOWS_SERVICE_SNAPSHOT", launcherState: "CANDIDATES_DIFFER",
  blockers: [], trustedInstalledRelease: false,
  signedReceiptVerified: false, masterShellAuthorized: false,
};

describe("Build 291 owner-guided original Windows follow-up panel", () => {
  it("is local-only on mount with unverified history and no execution control", () => {
    const current = vi.fn(() => review);
    render(<WindowsRecoveryDecision291Panel review={review}
      getCurrentReview={current} expectedMainSha={SHA} />);
    expect(current).not.toHaveBeenCalled();
    expect(screen.getByText(/0 independently verified acceptances/)).toBeInTheDocument();
    expect(screen.getByText(/Version drift:/).parentElement?.textContent).toContain("disagree");
    expect(screen.getByRole("button", { name: /Record owner follow-up decision locally/ }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: /Download private owner-decision history/ }))
      .toBeDisabled();
    expect(screen.queryByRole("button", { name: /restart|install|activate|publish|enroll/i }))
      .toBeNull();
  });

  it("records an explicitly acknowledged local owner note without trusting the host", () => {
    const current = vi.fn(() => review);
    render(<WindowsRecoveryDecision291Panel review={review}
      getCurrentReview={current} expectedMainSha={SHA} />);
    fireEvent.click(screen.getByRole("checkbox", {
      name: /saves only an unverified owner note/i,
    }));
    fireEvent.click(screen.getByRole("button", { name: "Record owner follow-up decision locally" }));
    expect(current).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/1 session decision\(s\) recorded/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Owner recovery decision history" }))
      .toHaveTextContent("original host acceptance: HOLD");
    expect(screen.getByRole("button", { name: /Download private owner-decision history/ }))
      .toBeEnabled();
    expect(screen.getByRole("checkbox", { name: /saves only an unverified owner note/i }))
      .not.toBeChecked();
  });

  it("refuses stale evidence at click even when earlier render showed drift", () => {
    const stale = { ...review, disposition: "HOLD_MISSING_OR_STALE_EVIDENCE" as const };
    const current = vi.fn(() => stale);
    render(<WindowsRecoveryDecision291Panel review={review}
      getCurrentReview={current} expectedMainSha={SHA} />);
    fireEvent.click(screen.getByRole("radio", { name: /Review the existing supervised recovery/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /saves only an unverified owner note/i }));
    fireEvent.click(screen.getByRole("button", { name: "Record owner follow-up decision locally" }));
    expect(screen.getByText(/Decision was not recorded/)).toBeInTheDocument();
    expect(screen.getByText(/0 session decision\(s\) recorded/)).toBeInTheDocument();
  });
});
