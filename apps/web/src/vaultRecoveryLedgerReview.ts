/** Build 129: static guidance only; no trusted checkpoint, backup or vault service exists. */
export const VAULT_RECOVERY_LEDGER_SCHEMA = "rosevear-vault-recovery-ledger-review/v1" as const;

export const vaultRecoveryReviewStages = [
  { id: "witness", title: "Independent monotonic checkpoint", requirement: "An attacker who restores ciphertext and its local ledger together can hide rollback. A future owner-controlled, independently protected checkpoint must retain the latest accepted version; no such witness is installed." },
  { id: "commit", title: "Atomic version and manifest commit", requirement: "Review an immutable owner/document binding, distinct envelope ID and predecessor receipt; concurrent editors need compare-and-swap, crash-safe persistence and a durable acknowledgement." },
  { id: "restore", title: "Restore without silent downgrade", requirement: "Validate a complete encrypted snapshot and current trusted checkpoint before restoring; stale, forked, missing or future-version claims must fail closed and request supervised reconciliation." },
  { id: "backup", title: "Separated encrypted offline backups", requirement: "Recovery media must be independently encrypted, owner-held, periodically checked and protected from the Windows vault process, Hub, camera jobs, cloud sync and malware." },
  { id: "recovery_identity", title: "Independent identity and emergency approval", requirement: "No Hub owner override, MFA checkbox or unsupported recovery code may advance a ledger. Future recovery needs reviewed vault-only identity, owner step-up, revocation and separate witnesses." },
  { id: "field", title: "Windows power-loss and disaster acceptance", requirement: "Owner-supervised testing must cover crash between stages, backup corruption, stolen/rolled-back server, reboot, lost-device recovery, private HTTPS, Windows ACLs and audit redaction." },
] as const;

export const vaultRecoveryDenialCases = [
  { id: "old_snapshot", title: "Older but valid encrypted snapshot", expected: "Reject a cryptographically intact lower revision when the independently trusted witness knows a newer revision." },
  { id: "same_version_conflict", title: "Same revision with different manifest", expected: "Reject a conflicting envelope at the witnessed revision, even if every individual encrypted chunk authenticates." },
  { id: "no_witness", title: "Missing or co-rolled-back checkpoint", expected: "No trusted witness means no rollback assurance or automatic restoration; escalation to owner review is mandatory." },
  { id: "cross_owner", title: "Other household identity", expected: "An owner or document mismatch cannot borrow another person's latest trusted receipt or recovery authority." },
  { id: "race_crash", title: "Concurrent write or interrupted commit", expected: "Reject stale predecessor claims and never promise persistence until data and independent witness state commit consistently." },
  { id: "forged_evidence", title: "Fabricated security approval", expected: "A forged UI review flag, Hub admin role, or claimed MFA success cannot turn on any vault operation or backup restore." },
] as const;

/** Every apparent approval is untrusted; there is no persistent ledger or recoverable vault. */
export function assessVaultRecoveryLedger(_untrustedEvidence?: Record<string, boolean>) {
  return {
    schema: VAULT_RECOVERY_LEDGER_SCHEMA,
    phase: "HYPOTHETICAL_LEDGER_TESTS_ONLY" as const,
    test_data: "SYNTHETIC_IN_MEMORY" as const,
    independent_trust_anchor_installed: false as const,
    atomic_commit_installed: false as const,
    version_witness_persistent: false as const,
    encrypted_backup_installed: false as const,
    offline_restore_enabled: false as const,
    document_intake: "DISABLED" as const,
    vault_operation: "DENY" as const,
    mfa_enforced: false as const,
    windows_owner_acceptance: "HOLD" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
