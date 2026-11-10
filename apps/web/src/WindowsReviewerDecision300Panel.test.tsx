import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsReviewerDecision300Panel } from "./WindowsReviewerDecision300Panel";

afterEach(() => cleanup());

describe("Build 300 private reviewer decision UI", () => {
  it("stays local, requires acknowledgement, and never claims authority", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsReviewerDecision300Panel expectedMainSha={"a".repeat(40)} />);
      expect(screen.getByText(/SOURCE_REVISION_UNAVAILABLE/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download Build 300/ })).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/Latest source/),
        { target: { value: "c".repeat(40) } });
      expect(screen.getByText(/SOURCE_REVISION_DRIFT/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Clear Build 300/ }));
      expect(screen.getByText(/Build 300 private review inputs cleared/)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
