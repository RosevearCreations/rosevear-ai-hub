import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VaultArchitectureView } from "./VaultArchitectureView";

afterEach(() => cleanup());

describe("Build 119 Hub client architecture screen", () => {
  it("makes security hold and absent 2FA explicit without a password-entry surface", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<VaultArchitectureView />);
    expect(screen.getByRole("heading", { name: "Private password and document vault" })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Our own local vault: direction selected" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Threat model & encryption library review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Disposable-data encryption & tamper tests" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent vault service & family identity boundary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Document recovery & anti-rollback ledger design" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent Windows vault security & owner acceptance protocol" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent vault findings & remediation triage" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent assessor handoff & evidence readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vault change-impact reassessment & mandatory retest mapping" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vault security readiness command center" })).toBeInTheDocument();
    expect(screen.getByText("0 / 6 VERIFIED · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Vault security review sections" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Genuine independent assessor review" })).toBeInTheDocument();
    expect(screen.getByText("INDEPENDENT RETEST REQUIRED · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Changed source or rebuilt executable" })).toBeInTheDocument();
    expect(screen.getByText(/A passing invented change-map is/)).toBeInTheDocument();
    expect(screen.getByText("ASSESSOR NOT ENGAGED · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Immutable source-to-Windows artifact map" })).toBeInTheDocument();
    expect(screen.getByText(/Completing a fictional scope packet never lifts this gate/)).toBeInTheDocument();
    expect(screen.getByText("AUDIT NOT PERFORMED · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent retest and regression evidence" })).toBeInTheDocument();
    expect(screen.getByText(/Synthetic issue triage is not a security certificate/)).toBeInTheDocument();
    expect(screen.getByText("WINDOWS ACCEPTANCE · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verified Windows build provenance" })).toBeInTheDocument();
    expect(screen.getByText(/Even a complete synthetic checklist never lifts this gate/)).toBeInTheDocument();
    expect(screen.getByText("RECOVERY OFF · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Independent monotonic checkpoint" })).toBeInTheDocument();
    expect(screen.getByText(/If malware rolls back both the document and its locally stored ledger/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Private document pipeline & integrity preparation" })).toBeInTheDocument();
    expect(screen.getByText("DOCUMENTS OFF · HOLD")).toBeInTheDocument();
    expect(screen.getByText(/An entire valid old encrypted document can still be replayed/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No active document preview" })).toBeInTheDocument();
    expect(screen.getByText("SERVICE OFF · HOLD")).toBeInTheDocument();
    expect(screen.getByText(/Our tests simulate forged sessions and factor approvals/)).toBeInTheDocument();
    expect(screen.getByText(/Current contract:/)).toBeInTheDocument();
    expect(screen.getByText("LIVE VAULT HOLD")).toBeInTheDocument();
    expect(screen.getByText(/Identical encrypted records can still be replayed/)).toBeInTheDocument();
    expect(screen.getByText(/WEB_CRYPTO_AES_256_GCM/)).toBeInTheDocument();
    expect(screen.getByText("CRYPTO UNAPPROVED · HOLD")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Browser Web Crypto AES-GCM" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Argon2id via independently reviewed library" })).toBeInTheDocument();
    expect(screen.getByText(/No library is approved, no encryption runtime installed/)).toBeInTheDocument();
    expect(screen.getByText("SECURITY REVIEW REQUIRED")).toBeInTheDocument();
    expect(screen.getByText(/password storage, document upload and MFA are all still disabled/)).toBeInTheDocument();
    expect(screen.getByText(/field evidence unavailable, real MFA disabled and password intake blocked/)).toBeInTheDocument();
    expect(screen.getByText(/authenticator enrollment, step-up and recovery code issuance disabled/)).toBeInTheDocument();
    expect(screen.getByText(/Our design: not security-approved; service: not installed; client unlock: disabled/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps private accounts, Knowledge and integration Secrets deliberately separate", () => {
    render(<VaultArchitectureView />);
    expect(screen.getAllByText(/individual household accounts/)).toHaveLength(2);
    expect(screen.getByText(/Keep public recipes, car maintenance procedures and ordinary owners manuals in/)).toBeInTheDocument();
    expect(screen.getByText(/Hub Secrets remains for integration tokens only/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Private documents" })).toBeInTheDocument();
    expect(screen.getByText(/No third-party vault hosting or commercial password-manager service is planned/)).toBeInTheDocument();
    expect(screen.getByText(/Phished or stolen Hub session impersonates a household member/)).toBeInTheDocument();
    expect(screen.getByText(/Server theft, unlocked browser, memory dump/)).toBeInTheDocument();
  });

  it("provides keyboard-accessible local review links with real matching sections and no data submission", () => {
    render(<VaultArchitectureView />);
    const nav = screen.getByRole("navigation", { name: "Vault security review sections" });
    const anchors = Array.from(nav.querySelectorAll("a"));
    expect(anchors).toHaveLength(11);
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      expect(href).toMatch(/^#vault-[a-z-]+$/);
      const target = document.getElementById(href!.slice(1));
      expect(target).not.toBeNull();
      expect(target).toHaveAttribute("tabindex", "-1");
    }
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
