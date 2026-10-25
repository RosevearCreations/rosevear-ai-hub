import { vaultAssessorHandoffScopes, type VaultHandoffScopeId } from "./vaultAssessorHandoff";

/** Build 133: change-impact planning for a future independent assessor, not a live release gate. */
export const VAULT_CHANGE_IMPACT_SCHEMA = "rosevear-vault-change-impact-review/v1" as const;
export const SYNTHETIC_CHANGE_IMPACT_SCHEMA = "rosevear-vault-synthetic-change-impact/v1" as const;

export const vaultChangeImpactKinds = [
  { id: "source_rebuild", title: "Changed source or rebuilt executable", consequence: "A new commit, build recipe, executable, signature or configuration cannot inherit an earlier review automatically.", scopes: ["source_artifact", "dependencies", "negative_tests", "owner_boundary"] },
  { id: "crypto_library", title: "Cryptographic dependency or key handling changed", consequence: "Review exact dependency versions, passphrase derivation, client key custody, encryption context and earlier exploit regression cases.", scopes: ["source_artifact", "dependencies", "key_identity", "negative_tests"] },
  { id: "household_identity", title: "Household identity or vault-only MFA changed", consequence: "Reassess independent account separation, step-up, revoked sessions, client lock, emergency recovery and authentication denial tests.", scopes: ["key_identity", "negative_tests", "owner_boundary"] },
  { id: "windows_service", title: "Windows process identity, ACL or service changed", consequence: "Recheck exact binary and service permissions, secret isolation, power restoration and accidental access from other Hub/home services.", scopes: ["source_artifact", "windows_network", "negative_tests", "owner_boundary"] },
  { id: "private_access", title: "Private HTTPS, firewall or Tailscale changed", consequence: "Review origin/certificate trust, network exposure, same-site/session isolation, and access revocation on both private access paths.", scopes: ["key_identity", "windows_network", "negative_tests"] },
  { id: "document_recovery", title: "Document processing, backup or rollback witness changed", consequence: "Re-test hostile file handling, chunk context, atomic restore and a checkpoint independent of encrypted data and its backups.", scopes: ["document_recovery", "negative_tests", "owner_boundary"] },
] as const satisfies readonly {
  id: string;
  title: string;
  consequence: string;
  scopes: readonly VaultHandoffScopeId[];
}[];

export const vaultChangeImpactDenials = [
  { id: "no_delta", title: "Empty change packet or claimed no impact", expected: "Missing change evidence cannot prove there was no security-relevant drift; fail closed instead of silently reusing an approval." },
  { id: "stale_review", title: "Previously cleared but changed artifact", expected: "An earlier reviewed SHA or Windows executable is not acceptance for a changed binary, dependency or runtime configuration." },
  { id: "scope_waiver", title: "One review area declared not applicable", expected: "The impact map proposes mandatory revisit areas; neither owner role nor synthetic marker can waive independent retesting." },
  { id: "secret_details", title: "Evidence packet contains keys or private data", expected: "Never accept raw credentials, file contents, local paths, recovery codes, account names, arbitrary text or real reviewer statements." },
  { id: "co_rollback", title: "Changed recovery witness remains co-located", expected: "A version record that can be rolled back alongside encrypted files cannot authorize a real restore or close a finding." },
  { id: "fake_retest", title: "Synthetic retest marked approved", expected: "All mapped review areas still require a genuine independent reviewer and a separate witnessed, owner-approved disposable Windows field trial." },
] as const;

export type VaultChangeKind = (typeof vaultChangeImpactKinds)[number]["id"];
export type SyntheticVaultChangePacket = {
  schema: typeof SYNTHETIC_CHANGE_IMPACT_SCHEMA;
  environment: "IN_MEMORY_SIMULATION";
  base_artifact: "DEMO_BEFORE";
  candidate_artifact: "DEMO_AFTER";
  changes: { id: VaultChangeKind; provenance: "SYNTHETIC" }[];
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, names: readonly string[]) =>
  Object.keys(v).length === names.length && names.every(name => Object.hasOwn(v, name));

/** Strict invented-only impact routing, with no disk, secret, service, reviewer or approval access. */
export function mapSyntheticVaultChangeImpact(input: unknown) {
  const invalid = {
    classification: "INVALID_SYNTHETIC_CHANGE_PACKET" as const,
    impacted_scope_ids: [] as VaultHandoffScopeId[],
    change_count: 0,
    independent_retest: "REQUIRED" as const,
    production_security_acceptance: "HOLD" as const,
  };
  if (!isRecord(input) || !exactKeys(input, ["schema", "environment", "base_artifact", "candidate_artifact", "changes"])) return invalid;
  if (input.schema !== SYNTHETIC_CHANGE_IMPACT_SCHEMA || input.environment !== "IN_MEMORY_SIMULATION" || input.base_artifact !== "DEMO_BEFORE" || input.candidate_artifact !== "DEMO_AFTER") return invalid;
  if (!Array.isArray(input.changes) || input.changes.length === 0 || input.changes.length > vaultChangeImpactKinds.length) return invalid;
  const seen = new Set<VaultChangeKind>();
  const impacted = new Set<VaultHandoffScopeId>();
  for (const item of input.changes) {
    if (!isRecord(item) || !exactKeys(item, ["id", "provenance"])) return invalid;
    const kind = vaultChangeImpactKinds.find(change => change.id === item.id);
    if (!kind || item.provenance !== "SYNTHETIC" || seen.has(kind.id)) return invalid;
    seen.add(kind.id);
    kind.scopes.forEach(scope => impacted.add(scope));
  }
  return {
    classification: "SYNTHETIC_REASSESSMENT_REQUIRED_NOT_A_REVIEW" as const,
    impacted_scope_ids: vaultAssessorHandoffScopes.filter(scope => impacted.has(scope.id)).map(scope => scope.id),
    change_count: seen.size,
    independent_retest: "REQUIRED" as const,
    production_security_acceptance: "HOLD" as const,
  };
}

/** Untrusted approvals never grant a Windows pilot, password entry, document access or MFA. */
export function assessVaultChangeImpactReview(_untrustedClaims?: Record<string, unknown>) {
  return {
    schema: VAULT_CHANGE_IMPACT_SCHEMA,
    phase: "RETEST_MAPPING_PREPARATION_ONLY" as const,
    actual_change_assessed: false as const,
    independent_reviewer_engaged: false as const,
    real_retests_completed: false as const,
    reviewed_windows_artifact_verified: false as const,
    owner_disposable_pilot_approved: false as const,
    windows_vault_installed: false as const,
    credential_intake: "DISABLED" as const,
    document_intake: "DISABLED" as const,
    mfa_enforced: false as const,
    backup_restore_enabled: false as const,
    vault_operation: "DENY" as const,
    windows_owner_acceptance: "HOLD" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
