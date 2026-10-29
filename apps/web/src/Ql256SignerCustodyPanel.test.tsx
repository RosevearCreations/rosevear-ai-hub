import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Ql256SignerCustodyPanel } from "./Ql256SignerCustodyPanel";

describe("Build 183 QL-256 real signer custody readiness panel", () => {
  it("shows authentic previous source/CI without claiming signer or connection", () => {
    render(<Ql256SignerCustodyPanel reassessments={[]} />);
    expect(screen.getByText(/SIGNER_STATUS_UNKNOWN/)).toBeTruthy();
    expect(screen.getByText(/HTTP 404/)).toBeTruthy();
    expect(screen.getByText(/NOT GIVEN/)).toBeTruthy();
    expect(screen.getByText(/DISCONNECTED \/ HOLD/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "40878851316" })).toHaveAttribute("href",
      "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/40878851316");
  });
  it("has no controls for making an owner or witness attestation", () => {
    render(<Ql256SignerCustodyPanel reassessments={[]} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
