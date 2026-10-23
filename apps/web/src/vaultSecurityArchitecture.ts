/** Build 119 is a documented proposal, deliberately NOT an operational password manager. */
export const VAULT_ARCHITECTURE_VERSION = "rosevear-vault-security-architecture/v1" as const;

export const vaultControls = [
  { id: "reviewed_provider", title: "Reviewed vault provider", detail: "Approve a maintained self-hosted password manager and its licensing for our actual household use." },
  { id: "isolation", title: "Separate encrypted storage", detail: "Use a dedicated vault database and account boundary, never Hub Secrets, Knowledge, Chat or AI tools." },
  { id: "individual_identity", title: "Individual household accounts", detail: "Each person has a private vault; shared entries require explicit owner permission and an acceptable provider licence." },
  { id: "client_side_crypto", title: "Client-managed cryptography", detail: "Passwords and vault keys are encrypted/decrypted in the reviewed vault client, not by Hub endpoints or Ollama." },
  { id: "private_https", title: "Private trusted HTTPS", detail: "Use a verified dedicated origin on the trusted LAN or restricted Tailscale; no router forwarding or public exposure." },
  { id: "mfa", title: "Two-factor enrollment", detail: "Require independent FIDO2/WebAuthn authenticators, backup factor and tested lost-device recovery before use." },
  { id: "client_lock", title: "Lock, session and device revocation", detail: "Enforce idle lock, logout, client-device revocation and no Hub cookie or server-side unlock sharing." },
  { id: "backup_restore", title: "Encrypted offline recovery", detail: "Rehearse isolated restoration; keep recovery materials and keys separate from the server and backup." },
  { id: "leakage_tests", title: "Leakage and abuse tests", detail: "Test stolen browser/server, XSS, phishing, audit redaction, caches, clipboard and failed MFA." },
  { id: "windows_acceptance", title: "Installed Windows owner acceptance", detail: "Verify the real private origin, startup/reboot, client access and actual two-factor prompts on our server." },
] as const;

export type VaultControlId = (typeof vaultControls)[number]["id"];
export type VaultSecurityEvidence = Readonly<Partial<Record<VaultControlId, "reviewed" | "pending">>>;

/** Evidence checkboxes alone must never activate vault credentials, even if all are marked reviewed. */
export function assessVaultSecurityArchitecture(evidence: VaultSecurityEvidence = {}) {
  const reviewed = vaultControls.filter(control => evidence[control.id] === "reviewed").length;
  return {
    schema: VAULT_ARCHITECTURE_VERSION,
    phase: "ARCHITECTURE_ONLY" as const,
    credential_intake: "DISABLED" as const,
    vault_endpoint_available: false as const,
    hub_decrypts_vault_data: false as const,
    hub_password_autofill: false as const,
    mfa_enforced: false as const,
    production_security_acceptance: "HOLD" as const,
    review_progress: { reviewed, required: vaultControls.length },
    next_build: 120,
  };
}

export const vaultThreats = [
  { threat: "Compromised Windows host or stolen backups", boundary: "Client-side vault keys; independent encrypted, restorable offline backup" },
  { threat: "Stolen phone, browser or shared PC session", boundary: "Vault master unlock, idle lock, device/session revocation and separate household identities" },
  { threat: "Phishing or account takeover", boundary: "Phishing-resistant second factor plus safe recovery and dedicated trusted HTTPS origin" },
  { threat: "AI / Knowledge / connector leakage", boundary: "No vault plaintext, key, tokens or decrypted API are ever made available to Hub services" },
  { threat: "Unexpected public access or lateral movement", boundary: "Separate local-only service, narrowly restricted LAN/Tailscale HTTPS and no public port forwards" },
] as const;
