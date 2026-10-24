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
    expect(screen.getByRole("heading", { name: "Isolation and client-lock readiness" })).toBeInTheDocument();
    expect(screen.getByText("PREPARATION ONLY")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Passkeys, step-up and emergency recovery" })).toBeInTheDocument();
    expect(screen.getByText("HOLD · MFA OFF")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Windows vault security verification" })).toBeInTheDocument();
    expect(screen.getByText("FIELD ACCEPTANCE HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose our independent password keeper" })).toBeInTheDocument();
    expect(screen.getByText("OWNER DECISION REQUIRED")).toBeInTheDocument();
    expect(screen.getByText(/No provider selected, no installation authorized, and no password storage enabled/)).toBeInTheDocument();
    expect(screen.getByText(/field evidence unavailable, real MFA disabled and password intake blocked/)).toBeInTheDocument();
    expect(screen.getByText(/authenticator enrollment, step-up and recovery code issuance disabled/)).toBeInTheDocument();
    expect(screen.getByText(/Provider: not approved; service: not installed; client unlock: disabled/)).toBeInTheDocument();
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
