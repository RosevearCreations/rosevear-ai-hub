import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WindowsEvidenceIntake293Panel } from "./WindowsEvidenceIntake293Panel";

afterEach(() => cleanup());
const SHA = "a".repeat(40);

describe("Build 293 original-Windows intake panel", () => {
  it("starts without reads, network operations, stored reviews or verification authority", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsEvidenceIntake293Panel episodes={[]} expectedMainSha={SHA} />);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Record local intake review (HOLD)" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Download private unverified intake review/ })).toBeDisabled();
      expect(screen.getByText(/0 local intake review\(s\); 0 independently verified receipts/)).toBeInTheDocument();
      expect(screen.getByRole("table", { name: /Seven independent gates/ })).toHaveTextContent("HOLD");
      expect(screen.getByRole("checkbox", { name: /does not attest the original Windows machine/ })).toBeDisabled();
      expect(screen.queryByRole("button", { name: /^verify signed receipt$|^publish$|^enroll signer$/i })).toBeNull();
    } finally { fetchSpy.mockRestore(); }
  });
});
