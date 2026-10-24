/** Build 121 is a review-only policy: the Hub is NEVER a vault authenticator. */
export const VAULT_MFA_SCHEMA = "rosevear-vault-mfa-readiness/v1" as const;

export const vaultMfaReviewGates = [
  { id: "provider", title: "Provider-owned MFA", detail: "Approve the independent password manager, its supported WebAuthn/FIDO2 implementation and account recovery limitations." },
  { id: "origin", title: "Verified private HTTPS origin", detail: "Confirm the exact vault HTTPS origin, trusted certificate and scoped LAN/Tailscale reachability; reject unexpected domains and public port forwarding." },
  { id: "individual", title: "Separate household identities", detail: "Each person enrolls their own authenticator. Neither Hub owner/admin roles nor another family member may bypass the provider's challenges." },
  { id: "primary", title: "Phishing-resistant primary factor", detail: "Test a real hardware security key or provider-supported passkey with user presence/verification and origin-bound challenges." },
  { id: "backup", title: "Backup authenticator", detail: "Enroll and test a second independent factor/device before treating a lost primary key as recoverable." },
  { id: "step_up", title: "Step-up and session controls", detail: "Review reauthentication for sensitive changes, idle lock, explicit sign-out, revoked device/session, stale challenge and account switching." },
  { id: "recovery", title: "Owner-supervised emergency recovery", detail: "Document lost-device recovery, identity checks, recovery-code custody, incident logging and restoration without silently bypassing MFA." },
  { id: "negative", title: "Fail-closed abuse testing", detail: "Reject wrong-origin assertion, replayed/expired challenge, missing factor, stolen Hub session, revoked authenticator and ordinary role escalation." },
] as const;

export const vaultMfaDenialCases = [
  { situation: "Only Hub login is present", requirement: "Separate vault sign-in and genuine provider MFA remain necessary" },
  { situation: "MFA assertion is absent, expired or from another origin", requirement: "No vault access; provider must reject the authentication attempt" },
  { situation: "A device or key is reported lost", requirement: "Revoke the device and require separately verified owner recovery" },
  { situation: "Recovery material is unavailable", requirement: "Do not invent a bypass or reveal another household member's data" },
] as const;

export type VaultMfaGateId = (typeof vaultMfaReviewGates)[number]["id"];

/** Review progress is never a token, MFA assertion, authorization or security acceptance. */
export function assessVaultMfaReadiness(review: Readonly<Partial<Record<VaultMfaGateId, "reviewed" | "pending">>> = {}) {
  return {
    schema: VAULT_MFA_SCHEMA,
    phase: "POLICY_REVIEW_ONLY" as const,
    provider_approved: false as const,
    authenticator_enrollment: "DISABLED" as const,
    mfa_enforced: false as const,
    step_up_available: false as const,
    recovery_codes_issued: false as const,
    emergency_recovery_available: false as const,
    credential_intake: "DISABLED" as const,
    private_origin_verified: false as const,
    vault_access: "DENY" as const,
    production_security_acceptance: "HOLD" as const,
    progress: {
      reviewed: vaultMfaReviewGates.filter(gate => review[gate.id] === "reviewed").length,
      required: vaultMfaReviewGates.length,
    },
  };
}
