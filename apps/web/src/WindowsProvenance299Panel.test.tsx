import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsProvenance299Panel } from "./WindowsProvenance299Panel";

afterEach(() => cleanup());
describe("Build 299 offline reviewer intake and Shell HOLD export", () => {
  it("has no implicit network activity and exports no trusted result", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      render(<WindowsProvenance299Panel expectedMainSha={"a".repeat(40)} />);
      expect(screen.getByText(/PACKET_NOT_REVIEWABLE/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download sanitized Build 299/ })).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/Private Build 297 metadata-only packet/),
        { target: { value: "invalid" } });
      expect(screen.getByText(/REVIEW EXCEPTION HOLD/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Clear Build 299 private inputs/ }));
      expect(screen.getByText(/Private Build 299 review inputs cleared/)).toBeInTheDocument();
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});

