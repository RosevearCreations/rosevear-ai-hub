import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VaultDecisionGatePanel } from "./VaultDecisionGatePanel";
import { assessVaultDecisionGate, vaultDecisionQuestions, vaultDesignPaths, vaultFailureCases } from "./vaultDecisionGate";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 226 vault design decision gate", () => {
  it("never elevates a preference or synthetic evidence to real security approval", () => {
    const checked = vaultDecisionQuestions.map(question => question.id);
    for (const preference of [...vaultDesignPaths.map(path => path.id), "fake", null]) {
      const result = assessVaultDecisionGate(preference as never, checked, {
        reviewer_signed: true, verified_security_gates: 6, owner_approved: true,
        live_use_authorized: true, mfa_enabled: true,
      });
      expect(result.independently_verified_security_gates).toBe(0);
      expect(result.required_security_gates).toBe(6);
      expect(result.production_security_acceptance).toBe("HOLD");
      expect(result.owner_pilot_authorized).toBe(false);
      expect(result.credential_intake).toBe("DISABLED");
      expect(result.document_intake).toBe("DISABLED");
      expect(result.vault_service_installed).toBe(false);
    }
    expect(assessVaultDecisionGate("fake" as never).preference).toBeNull();
    expect(vaultFailureCases).toHaveLength(6);
  });

  it("offers keyboard-accessible session-only choices with explicit 0/6 gate and no fetching", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<VaultDecisionGatePanel />);
    expect(screen.getByRole("heading", { name: /First-party local vault: decision and independent review gate/ })).toBeInTheDocument();
    expect(screen.getByText("0 / 6 VERIFIED · SECURITY HOLD")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("password")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Continue first-party, Windows-local design/ }));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText(/1 of 6 questions reviewed locally/)).toBeInTheDocument();
    expect(screen.getByText(/Preference recorded in memory for this page only/)).toBeInTheDocument();
    expect(screen.getByText("0 / 6 VERIFIED · SECURITY HOLD")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear session-only decision notes" }));
    expect(screen.getByText(/0 of 6 questions reviewed locally/)).toBeInTheDocument();
    expect(screen.getByText(/No direction selected in this session/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
