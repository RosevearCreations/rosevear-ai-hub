/** Build 132: an offline assessor handoff contract, never an evidence intake or approval service. */
export const VAULT_ASSESSOR_HANDOFF_SCHEMA = "rosevear-vault-assessor-handoff/v1" as const;
export const SYNTHETIC_HANDOFF_SCHEMA = "rosevear-vault-synthetic-assessor-handoff/v1" as const;

/** A future reviewer must verify these separately against the same exact artifact. */
export const vaultAssessorHandoffScopes = [
  { id: "review_scope", title: "Independent reviewer and agreed scope", responsibility: "Owner and independent assessor", requirement: "Agree independence, confidentiality, permitted methods, acceptance limits and the exact first-party vault components. An owner-generated checklist is not a commissioned assessment." },
  { id: "source_artifact", title: "Immutable source-to-Windows artifact map", responsibility: "Engineering and independent assessor", requirement: "Pin the exact Git commit, build recipe, executable hash, signing status and Windows configuration. Record drift and replacement conditions; do not claim an executable exists today." },
  { id: "dependencies", title: "Cryptography and dependency inventory", responsibility: "Engineering and independent assessor", requirement: "Identify exact cryptographic APIs, package versions, lockfiles, vulnerable dependencies and key-derivation parameters for independent review. Browser Web Crypto is approved for synthetic tests only." },
  { id: "key_identity", title: "Per-person identity, keys and real MFA", responsibility: "Independent assessor", requirement: "Trace master-password derivation, client-only plaintext/key custody, household separation, vault-only second factor, revocation and recovery. A Hub admin session must confer no vault access." },
  { id: "windows_network", title: "Windows service and private network isolation", responsibility: "Independent assessor and Windows owner", requirement: "Inspect least-privilege Windows process, ACLs, dedicated private HTTPS origin, local firewall, Tailscale policy, reboot and failure boundaries without exposing our other home services." },
  { id: "document_recovery", title: "Document integrity and independent recovery witness", responsibility: "Independent assessor", requirement: "Assess bounded file intake, hostile document handling, authenticated encryption, atomic backups, crash recovery and a rollback witness protected separately from ciphertext and local backup." },
  { id: "negative_tests", title: "Negative tests, findings and independently witnessed retest", responsibility: "Independent assessor", requirement: "Link denied cases to exact reviewed binaries and sanitized finding IDs. Re-test original exploits plus related regressions; proposed fixes and passing repository checks cannot close real findings." },
  { id: "owner_boundary", title: "Separate Windows pilot decision and owner field acceptance", responsibility: "Windows owner after independent clearance", requirement: "Only a later, expressly authorized disposable-data pilot may generate field evidence. Source GREEN, an empty fictional ledger and an assessor packet cannot authorize installation, passwords or documents." },
] as const;

export const vaultAssessorHandoffDenials = [
  { id: "uncommissioned", title: "No independent reviewer engaged", expected: "A handoff plan cannot be presented as completed review, even with eight prepared synthetic scopes." },
  { id: "stale_build", title: "Changed executable, dependency or configuration", expected: "Artifact drift invalidates prior scope and conclusions until the independent reviewer explicitly reconciles it." },
  { id: "missing_scope", title: "Skipped trust boundary or negative test", expected: "An omitted control is a missing review item, not a tacit approval or a not-applicable waiver." },
  { id: "secret_receipt", title: "Credentials or private documents attached to review", expected: "Keep keys, passwords, MFA seeds, file contents and unnecessary personal identifiers out of Hub, GitHub and any synthetic packet." },
  { id: "co_rollback", title: "Vault data and recovery witness rolled back together", expected: "A simulated co-located version ledger is not a trustworthy anti-rollback mechanism for real encrypted backups." },
  { id: "false_pilot", title: "Reviewer or owner clearance forged in the UI", expected: "No checkbox, claimed signature or green CI badge can install a vault, lift security HOLD or permit real data." },
] as const;

export type VaultHandoffScopeId = (typeof vaultAssessorHandoffScopes)[number]["id"];
export type SyntheticHandoffScopeState = "MISSING" | "SIMULATED_PREPARED";
export type SyntheticAssessorHandoff = {
  schema: typeof SYNTHETIC_HANDOFF_SCHEMA;
  environment: "IN_MEMORY_SIMULATION";
  artifact: "DEMO_ARTIFACT_ONLY";
  controls: { id: VaultHandoffScopeId; state: SyntheticHandoffScopeState; provenance: "SYNTHETIC" }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));

/** Strictly invented scope coverage, deliberately unable to ingest external findings. */
export function inspectSyntheticAssessorHandoff(input: unknown) {
  const invalid = { classification: "INVALID_SYNTHETIC_HANDOFF" as const, missing_scopes: 0, production_security_acceptance: "HOLD" as const };
  if (!isRecord(input) || !exactKeys(input, ["schema", "environment", "artifact", "controls"])) return invalid;
  if (input.schema !== SYNTHETIC_HANDOFF_SCHEMA || input.environment !== "IN_MEMORY_SIMULATION" || input.artifact !== "DEMO_ARTIFACT_ONLY") return invalid;
  if (!Array.isArray(input.controls) || input.controls.length !== vaultAssessorHandoffScopes.length) return invalid;
  const seen = new Set<string>();
  let missing = 0;
  for (const control of input.controls) {
    if (!isRecord(control) || !exactKeys(control, ["id", "state", "provenance"])) return invalid;
    if (typeof control.id !== "string" || !vaultAssessorHandoffScopes.some(scope => scope.id === control.id) || seen.has(control.id)) return invalid;
    if (control.provenance !== "SYNTHETIC" || (control.state !== "MISSING" && control.state !== "SIMULATED_PREPARED")) return invalid;
    seen.add(control.id);
    if (control.state === "MISSING") missing++;
  }
  return {
    classification: missing ? "SYNTHETIC_HANDOFF_INCOMPLETE" as const : "SYNTHETIC_HANDOFF_PREPARED_NOT_REVIEWED" as const,
    missing_scopes: missing,
    production_security_acceptance: "HOLD" as const,
  };
}

/** No untrusted report, role or claimed signature can change these real-world holds. */
export function assessVaultAssessorHandoff(_untrustedClaims?: Record<string, unknown>) {
  return {
    schema: VAULT_ASSESSOR_HANDOFF_SCHEMA,
    phase: "ASSESSOR_HANDOFF_PREPARATION_ONLY" as const,
    independent_reviewer_engaged: false as const,
    actual_vault_source_audited: false as const,
    windows_artifact_verified: false as const,
    real_evidence_received: false as const,
    real_findings_retested: false as const,
    owner_pilot_authorized: false as const,
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
