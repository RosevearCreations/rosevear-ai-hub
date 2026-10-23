import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VaultArchitectureView } from "./VaultArchitectureView";

afterEach(() => cleanup());

describe("Build 119 Hub client architecture screen", () => {
  it("makes security hold and absent 2FA explicit without a password-entry surface", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<VaultArchitectureView />);
    expect(screen.getByRole("heading", { name: "Private password vault" })).toBeInTheDocument();
    expect(screen.getByText("SECURITY HOLD")).toBeInTheDocument();
    expect(screen.getByText("Do not enter real passwords yet.")).toBeInTheDocument();
    expect(screen.getByText(/Two-factor protection is a requirement, not active yet/)).toBeInTheDocument();
    expect(screen.getByText(/0 \/ 10 verified/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps private accounts, Knowledge and integration Secrets deliberately separate", () => {
    render(<VaultArchitectureView />);
    expect(screen.getByText(/each household member, opened from the Hub client/)).toBeInTheDocument();
    expect(screen.getByText(/Keep recipes, car maintenance procedures and digital owners manuals in/)).toBeInTheDocument();
    expect(screen.getByText(/Hub Secrets remains for integration tokens only/)).toBeInTheDocument();
  });
});
