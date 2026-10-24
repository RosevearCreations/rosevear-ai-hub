/**
 * Build 127: immutable review-only contract for a FUTURE isolated vault service.
 * There is no service, route handler, identity provider or real vault session.
 */
export const VAULT_SERVICE_BOUNDARY_SCHEMA = "rosevear-vault-service-boundary/v1" as const;

export const vaultServiceBoundaries = [
  { id: "origin", title: "Independent private HTTPS origin", requirement: "A dedicated, owner-verified Caddy HTTPS hostname and WebAuthn relying-party ID, available only through approved LAN/Tailscale paths; Hub origin and cookies are not accepted." },
  { id: "identity", title: "Independent family vault identity", requirement: "Per-person vault identity and session verifier, independent unlock key, separate MFA and backup device. Neither a Hub administrator nor a Home Assistant account becomes a vault owner." },
  { id: "process", title: "Separate Windows process and account", requirement: "Constrained service identity, ACL and storage root; no access by Ollama, Hub server, camera integration, Knowledge search, logs or support diagnostics." },
  { id: "ciphertext", title: "Authenticated ciphertext store", requirement: "Future service can authorize encrypted owner-scoped record access only. Decrypted content and unwrapped keys must never cross its boundary." },
  { id: "recovery", title: "Revocation, recovery and audit separation", requirement: "Offline owner-held recovery, independent revoke/step-up, bounded redacted audit metadata and no override inherited from Hub admin roles." },
] as const;

export const vaultServiceDenialCases = [
  { id: "hub_cookie", title: "Hub cookie or owner role", expected: "Hub login, even with administrator privileges, cannot open a vault record or register a vault factor." },
  { id: "wrong_origin", title: "Wrong origin or RP ID", expected: "A different site, localhost alias, unexpected host or unsigned origin must be denied." },
  { id: "other_owner", title: "Other person's account", expected: "A household member cannot obtain another member's encrypted record without a reviewed explicit grant and separate decryption rights." },
  { id: "replayed_session", title: "Stale/replayed session", expected: "Future session verifier must reject expired, revoked and replayed assertions and require independent step-up for exports." },
  { id: "mfa_bypass", title: "Missing or stolen MFA", expected: "No factor registration, unlock or emergency recovery may be authorized from a Hub approval checkbox." },
  { id: "service_off", title: "Service not installed", expected: "Every request is denied now, even with fabricated successful identity, origin, security review and Windows approval." },
] as const;

export type VaultPreviewActor = "ANONYMOUS" | "HUB_OWNER" | "HUB_ADMIN" | "HOUSEHOLD" | "SUPPOSED_VAULT_MEMBER";
export type VaultPreviewAction = "READ" | "WRITE" | "SHARE" | "EXPORT" | "UNLOCK" | "ENROLL_MFA" | "RECOVER";

export type VaultPreviewRequest = Readonly<{
  actor: VaultPreviewActor;
  action: VaultPreviewAction;
  independentVaultSession?: boolean;
  trustedOrigin?: boolean;
  validVaultMfa?: boolean;
  ownerApproved?: boolean;
  reviewCompleted?: boolean;
}>;

/** A non-network, non-cryptographic deny-by-default simulation, NOT authentication. */
export function assessVaultServiceBoundary(_request?: VaultPreviewRequest) {
  return {
    schema: VAULT_SERVICE_BOUNDARY_SCHEMA,
    phase: "ISOLATION_POLICY_PREVIEW_ONLY" as const,
    separate_vault_origin_configured: false as const,
    independent_vault_identity_installed: false as const,
    windows_vault_process_installed: false as const,
    hub_session_accepted: false as const,
    vault_endpoints_mounted: false as const,
    credential_intake: "DISABLED" as const,
    document_upload: "DISABLED" as const,
    mfa_enforced: false as const,
    vault_operation: "DENY" as const,
    denial_reason: "SERVICE_NOT_INSTALLED" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
