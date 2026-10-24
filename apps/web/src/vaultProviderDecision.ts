/** Build 123 is a provider-neutral decision packet, never a deployment authorization. */
export const VAULT_PROVIDER_DECISION_SCHEMA = "rosevear-vault-provider-decision/v1" as const;

export const vaultProviderCriteria = [
  { id: "license", title: "License and household sharing", ownerQuestion: "Will the license cover separate household accounts and the exact sharing features we need, at an acceptable ongoing cost?", evidence: "Current vendor terms, supported edition, number of members and sharing constraints" },
  { id: "maintenance", title: "Official maintenance and updates", ownerQuestion: "Is the solution maintained and compatible with our Windows server and supported client devices?", evidence: "Version-pinned official releases, update cadence, security notices and rollback plan" },
  { id: "crypto", title: "Reviewed client encryption", ownerQuestion: "Can the provider prove that the Hub cannot decrypt our personal records or master keys?", evidence: "Provider security documentation, audited encryption design and independent isolation review" },
  { id: "identity", title: "Family privacy and sharing", ownerQuestion: "Can each of us keep an individual vault while sharing only explicitly authorized records?", evidence: "Test-account permission matrix and separation from Hub admin roles" },
  { id: "mfa", title: "Hardware-key/passkey support", ownerQuestion: "Does this edition support independently enforced MFA, backup factors and safe recovery?", evidence: "Provider-specific WebAuthn/FIDO2, step-up and recovery documentation" },
  { id: "network", title: "Private Windows hosting", ownerQuestion: "Can the deployment use our separate Caddy HTTPS origin and restricted LAN/Tailscale without public forwarding?", evidence: "Resource budget, service boundary, firewall plan and certificate ownership" },
  { id: "backup", title: "Encrypted export and offline restore", ownerQuestion: "Can we keep encrypted backups and separately held recovery material and test restoration?", evidence: "Official export/backup support, isolated restore drill, retention and key-custody plan" },
  { id: "adoption", title: "Safe owner rollout", ownerQuestion: "Can we test on disposable accounts, reverse an unsuccessful pilot and keep our existing manager until acceptance?", evidence: "Staged adoption checklist, support plan, dry-run results and owner sign-off" },
] as const;

export const vaultProviderOptions = [
  { title: "Vendor-supported self-hosted keeper", note: "Investigate official Bitwarden self-hosted options and verify current edition, resource requirements and licensing before selection." },
  { title: "Offline encrypted file keeper", note: "Evaluate KeePassXC as an offline alternative; independently review controlled sharing, multi-device sync and client unlock expectations." },
  { title: "Other independently reviewed keeper", note: "An alternative requires the same evidence and explicit approval; never substitute an unreviewed custom encryption implementation." },
] as const;

export type VaultProviderCriterionId = (typeof vaultProviderCriteria)[number]["id"];
export type VaultProviderReview = Readonly<Partial<Record<VaultProviderCriterionId, "reviewed" | "pending" | "failed">>>;

/** Neither a candidate name nor checked paperwork may enable live service, MFA or secrets. */
export function assessVaultProviderDecision(review: VaultProviderReview = {}) {
  return {
    schema: VAULT_PROVIDER_DECISION_SCHEMA,
    phase: "OWNER_SELECTION_REQUIRED" as const,
    selected_provider: null,
    provider_approved: false as const,
    install_authorized: false as const,
    private_origin_verified: false as const,
    secret_storage_enabled: false as const,
    mfa_enforced: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
    review_progress: {
      reviewed: vaultProviderCriteria.filter(item => review[item.id] === "reviewed").length,
      failed: vaultProviderCriteria.filter(item => review[item.id] === "failed").length,
      required: vaultProviderCriteria.length,
    },
  };
}
