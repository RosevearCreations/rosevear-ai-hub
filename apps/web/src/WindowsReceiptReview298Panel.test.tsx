import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsReceiptReview298Panel } from "./WindowsReceiptReview298Panel";

afterEach(() => cleanup());
describe("Build 298 offline source-owner packet review", () => {
  it("starts blocked, allows only explicit OPEN triage and never calls a network receiver", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsReceiptReview298Panel expectedMainSha={"a".repeat(40)} />);
      expect(screen.getByText(/PACKET_MISSING/)).toBeInTheDocument();
      const button = screen.getByRole("button", { name: /Record Build 298 open triage/ });
      expect(button).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox", { name: /I understand this is an open/ }));
      fireEvent.click(button);
      expect(screen.getByText(/1 local triage note\(s\); 0 verified closures/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Clear Build 298 private review/ }));
      expect(screen.getByText(/0 local triage note\(s\); 0 verified closures/)).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});

