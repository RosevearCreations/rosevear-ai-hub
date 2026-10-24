/** Build 122 is a read-only field verification plan, never live vault attestation. */
export const VAULT_VERIFICATION_SCHEMA = "rosevear-vault-security-verification/v1" as const;

export const vaultVerificationChecks = [
  { id: "provider", title: "Reviewed, isolated first-party vault", detail: "Verify independently reviewed code/build, distinct runtime identity and per-person authorization; no Hub Secrets, Knowledge or AI bridge." },
  { id: "crypto", title: "Encryption and key handling", detail: "Inspect standard reviewed client encryption, key derivation, rotation and absence of master password, private documents or decrypted values in server traces." },
  { id: "https", title: "Private HTTPS and origin", detail: "Test certificate trust, exact dedicated hostname, scoped LAN/Tailscale connectivity and no public router port forwarding." },
  { id: "mfa", title: "Live second-factor denial tests", detail: "On disposable accounts, reject missing, replayed, expired and wrong-origin assertions; verify independent backup factor and revocation." },
  { id: "lock", title: "Client lock and stolen-device drill", detail: "Witness idle lock, sign-out, new device restrictions, active session termination and lost-client recovery without Hub authorization bypass." },
  { id: "backup", title: "Encrypted backup restoration", detail: "Restore disposable encrypted entries and documents to a separate test location; confirm independent offline key custody and no silent cloud sync." },
  { id: "leak", title: "Leakage and isolation scan", detail: "Check Hub logs, browser caches, clipboard, crash reports, exports, AI prompts, Knowledge search and camera tools for secret exposure." },
  { id: "windows", title: "Installed Windows reboot acceptance", detail: "On the actual owner Windows host, verify startup order, isolated service status, authenticated private clients and recovery after reboot." },
] as const;

export type VaultVerificationCheckId = (typeof vaultVerificationChecks)[number]["id"];
export type VaultVerificationEvidence = Readonly<Partial<Record<VaultVerificationCheckId, "reviewed" | "pending" | "failed">>>;

/** A reviewed checklist is not an independent technical test or owner sign-off. */
export function assessVaultSecurityVerification(evidence: VaultVerificationEvidence = {}) {
  const reviewed = vaultVerificationChecks.filter(check => evidence[check.id] === "reviewed").length;
  const failed = vaultVerificationChecks.filter(check => evidence[check.id] === "failed").length;
  return {
    schema: VAULT_VERIFICATION_SCHEMA,
    phase: "UNINSTALLED_REVIEW_ONLY" as const,
    provider_approved: false as const,
    live_vault_available: false as const,
    independent_windows_verified: false as const,
    field_evidence_available: false as const,
    credential_intake: "DISABLED" as const,
    mfa_enforced: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
    review_progress: { reviewed, failed, required: vaultVerificationChecks.length },
  };
}
