/** Build 120 preparation only: no provider, persistence, credential fields or API. */
export const VAULT_PREPARATION_SCHEMA = "rosevear-vault-preparation/v1" as const;

export const vaultPreparationStages = [
  { id: "provider", title: "Approve our own security design", detail: "Review first-party code boundaries, vetted crypto dependencies, individual household accounts, Windows hosting, maintenance and updates before installation." },
  { id: "storage", title: "Isolate encrypted data", detail: "Design a dedicated service identity, private volume, minimal file permissions, independent database and no Hub database tables, integrations or AI access." },
  { id: "origin", title: "Restrict the private origin", detail: "Reserve dedicated HTTPS hostname, Caddy routing and scoped LAN/Tailscale firewall rules. Never expose router ports or reuse Hub cookies." },
  { id: "lock", title: "Review the client lock contract", detail: "Require separate vault sign-in and unlock, a short idle lock, lock on sign-out and device revocation; never infer vault unlock from Hub login." },
  { id: "leak", title: "Prevent secret exposure", detail: "No Hub proxy, autofill, clipboard handling, analytics, localStorage, service worker cache, debug logging, Knowledge indexing or assistant tools for vault material." },
  { id: "recovery", title: "Plan encrypted backup recovery", detail: "Keep backup ciphertext and separately held recovery keys offline; document a restore rehearsal before importing actual records." },
] as const;

export type VaultPreparationStageId = (typeof vaultPreparationStages)[number]["id"];

/** Untrusted review flags are informative only, never an activation authorization. */
export function assessVaultPreparation(review: Readonly<Partial<Record<VaultPreparationStageId, boolean>>> = {}) {
  return {
    schema: VAULT_PREPARATION_SCHEMA,
    phase: "PREPARATION_ONLY" as const,
    approved_provider: null,
    service_installed: false as const,
    vault_url: null,
    credential_intake: "DISABLED" as const,
    client_unlock: "DISABLED" as const,
    server_secret_access: false as const,
    secrets_persisted_by_hub: false as const,
    mfa_enforced: false as const,
    production_security_acceptance: "HOLD" as const,
    reviewed: vaultPreparationStages.filter(stage => review[stage.id] === true).length,
    required: vaultPreparationStages.length,
  };
}
