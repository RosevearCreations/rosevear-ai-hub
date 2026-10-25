/** Build 134: read-only navigation and status. Not a security-attestation authority. */
export const VAULT_READINESS_DASHBOARD_SCHEMA = "rosevear-vault-readiness-command-center/v1" as const;

export const vaultReadinessMilestones = [
  { id: "implementation", title: "First-party vault implementation", state: "NOT BUILT", target: "vault-blueprint", detail: "The current code documents our own planned vault; no encrypted password/document store, unlock flow or securely derived permanent key exists." },
  { id: "isolation", title: "Isolated Windows runtime and household identity", state: "NOT INSTALLED", target: "vault-service", detail: "There is no separate least-privilege Windows vault service, private origin, individual vault account login or enforced vault-only MFA." },
  { id: "cryptography", title: "Independent cryptographic and dependency approval", state: "NOT APPROVED", target: "vault-crypto-review", detail: "Disposable browser AES-GCM tests do not approve production key derivation, dependency versions, side channels or client-side secret isolation." },
  { id: "assessment", title: "Genuine independent assessor review", state: "NOT COMMISSIONED", target: "vault-assessor", detail: "The eight handoff areas and simulated findings contain no actual third-party review, signed clearance or examined executable." },
  { id: "remediation", title: "Independent findings closure and retests", state: "NOT OBSERVED", target: "vault-findings", detail: "No real findings were investigated or retested. Changes to an assessed artifact must reopen impacted review controls." },
  { id: "field_acceptance", title: "Separate owner-approved Windows pilot", state: "NOT AUTHORIZED", target: "vault-windows", detail: "A disposable-data Windows pilot, physical negative tests, restored backups and owner-observed field acceptance have not occurred." },
] as const;

/** In-page destinations; never external, secret-handling, or state-changing links. */
export const vaultReviewNavigation = [
  { id: "vault-change-impact", label: "Change impact & retests", group: "Independent review" },
  { id: "vault-assessor", label: "External assessor handoff", group: "Independent review" },
  { id: "vault-findings", label: "Findings & remediation", group: "Independent review" },
  { id: "vault-windows", label: "Windows field acceptance", group: "Independent review" },
  { id: "vault-recovery", label: "Recovery & rollback", group: "Data protection" },
  { id: "vault-documents", label: "Document pipeline", group: "Data protection" },
  { id: "vault-service", label: "Service & household identity", group: "Architecture" },
  { id: "vault-crypto-review", label: "Cryptography review", group: "Architecture" },
  { id: "vault-blueprint", label: "First-party blueprint", group: "Architecture" },
  { id: "vault-lock", label: "Client lock & isolation", group: "Architecture" },
  { id: "vault-mfa", label: "MFA & recovery readiness", group: "Architecture" },
] as const;

/** Untrusted 'all complete' flags or Hub role cannot change actual readiness. */
export function assessVaultReadinessDashboard(_claims?: Record<string, unknown>) {
  return {
    schema: VAULT_READINESS_DASHBOARD_SCHEMA,
    phase: "UNVERIFIED_SECURITY_MILESTONES" as const,
    required_milestones: vaultReadinessMilestones.length,
    independently_verified_milestones: 0 as const,
    independent_security_review: "NOT PERFORMED" as const,
    windows_owner_acceptance: "HOLD" as const,
    windows_vault_installed: false as const,
    credential_intake: "DISABLED" as const,
    document_intake: "DISABLED" as const,
    mfa_enforced: false as const,
    backup_restore_enabled: false as const,
    vault_operation: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
