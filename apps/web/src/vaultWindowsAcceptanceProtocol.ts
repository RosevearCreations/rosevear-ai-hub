/** Build 130: a review packet, not an installed vault or an owner acceptance authority. */
export const VAULT_WINDOWS_ACCEPTANCE_SCHEMA = "rosevear-vault-windows-acceptance-review/v1" as const;
export const SYNTHETIC_WINDOWS_EVIDENCE_SCHEMA = "rosevear-vault-windows-fixture/v1" as const;

export const vaultWindowsAcceptanceGates = [
  { id: "independent_review", title: "Independent application and cryptography review", requirement: "An independent reviewer must examine the pinned first-party source, exact libraries, threat model, identity flows, key lifecycle, negative tests and unresolved findings. Our own CI or owner checklist cannot substitute for this review." },
  { id: "release_provenance", title: "Verified Windows build provenance", requirement: "Pin the reviewed commit and dependency versions to an independently checked Windows executable and installation receipt. Detect replaced binaries, unsigned updates, stale approvals and environment drift." },
  { id: "windows_isolation", title: "Dedicated Windows process and ACLs", requirement: "Use a separate least-privilege Windows identity, restricted data directory, isolated secrets, service permissions and crash/reboot checks. The Hub, Home Assistant, cameras and Ollama must not inherit vault access." },
  { id: "network_origin", title: "Private HTTPS, LAN and Tailscale boundary", requirement: "Owner and reviewer must inspect the actual certificate, isolated origin, local firewall and remote Tailscale policy. Deny public forwarding, other origins, reused Hub cookies and untrusted devices." },
  { id: "identity_mfa", title: "Separate household identity and step-up MFA", requirement: "Prove individual family accounts, revocation, replay rejection, recovery safeguards and real vault-only MFA on both approved access paths. A Hub administrator must not bypass client key custody or vault identity." },
  { id: "client_leaks", title: "Lock, exposure and client leakage tests", requirement: "Witness idle lock, stolen-session denial, clipboard limits and absence of plaintext in logs, browser persistence, Hub Knowledge, integration Secrets, AI prompts, exports, crash traces or screenshots." },
  { id: "documents_recovery", title: "Documents, independent witness and offline recovery", requirement: "Use disposable documents to test active-content rejection, encryption context, complete backups, restore after corruption and an independent anti-rollback witness. Do not claim rollback protection from a co-located ledger." },
  { id: "owner_field", title: "Owner-supervised Windows disaster acceptance", requirement: "Only after reviewer clearance and separately authorized disposable pilot, witness power loss, reboot, lost client, revoked user, restored data, negative MFA and private access on the actual Windows server. Record unresolved findings without real secrets." },
] as const;

export const vaultWindowsAcceptanceDenials = [
  { id: "source_only", title: "Green repository checks without Windows proof", expected: "Source workflow success cannot establish installed vault identity, runtime isolation or physical owner acceptance." },
  { id: "fake_signoff", title: "Forged reviewer or owner approval", expected: "Untrusted assertions, synthetic receipts and checked UI boxes cannot enable vault storage, MFA, backup, restore or a Windows service." },
  { id: "drift", title: "Changed binary, dependency or configuration", expected: "Any version or environment drift invalidates earlier findings; a fresh independent review and field trial are required." },
  { id: "revoked", title: "Stolen browser or revoked household member", expected: "A retained Hub cookie, old vault session or ordinary admin privilege must never revive revoked vault access." },
  { id: "co_rollback", title: "Encrypted snapshot and local ledger both rolled back", expected: "An intact old backup is not safe to restore without an independent current version witness and supervised reconciliation." },
  { id: "unobserved", title: "Unobserved, missing or failed field step", expected: "A single missing step, unresolved severity, unavailable reviewer or failed owner observation keeps production use on HOLD." },
] as const;

export type VaultWindowsGateId = (typeof vaultWindowsAcceptanceGates)[number]["id"];
export type SyntheticFieldOutcome = "PASS" | "FAIL" | "NOT_OBSERVED";

/** Untrusted fixture shape. It deliberately cannot include signatures, filenames or credentials. */
export type SyntheticWindowsEvidence = {
  schema: typeof SYNTHETIC_WINDOWS_EVIDENCE_SCHEMA;
  environment: "DISPOSABLE_SIMULATION";
  source_revision: "SYNTHETIC_BUILD";
  controls: { id: VaultWindowsGateId; outcome: SyntheticFieldOutcome; origin: "SIMULATED" }[];
};

const exactKeys = (value: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Classifies invented data only. No result of this function is a security attestation. */
export function inspectSyntheticWindowsEvidence(input: unknown) {
  const denied = { classification: "INVALID_SYNTHETIC_FIXTURE" as const, production_security_acceptance: "HOLD" as const };
  if (!isRecord(input) || !exactKeys(input, ["schema", "environment", "source_revision", "controls"])) return denied;
  if (input.schema !== SYNTHETIC_WINDOWS_EVIDENCE_SCHEMA || input.environment !== "DISPOSABLE_SIMULATION" || input.source_revision !== "SYNTHETIC_BUILD") return denied;
  if (!Array.isArray(input.controls) || input.controls.length !== vaultWindowsAcceptanceGates.length) return denied;
  const seen = new Set<string>();
  let complete = true;
  for (const control of input.controls) {
    if (!isRecord(control) || !exactKeys(control, ["id", "outcome", "origin"])) return denied;
    if (typeof control.id !== "string" || !vaultWindowsAcceptanceGates.some(gate => gate.id === control.id) || seen.has(control.id)) return denied;
    if (control.origin !== "SIMULATED" || !["PASS", "FAIL", "NOT_OBSERVED"].includes(String(control.outcome))) return denied;
    seen.add(control.id);
    if (control.outcome !== "PASS") complete = false;
  }
  return {
    classification: complete ? "COMPLETE_SYNTHETIC_CHECKLIST_ONLY" as const : "INCOMPLETE_SYNTHETIC_CHECKLIST" as const,
    production_security_acceptance: "HOLD" as const,
  };
}

/** Actual Windows and independent reviewer evidence cannot be submitted or approved here. */
export function assessVaultWindowsAcceptance(_untrustedClaims?: Record<string, unknown>) {
  return {
    schema: VAULT_WINDOWS_ACCEPTANCE_SCHEMA,
    phase: "PROTOCOL_REVIEW_ONLY" as const,
    independent_reviewer_accepted: false as const,
    pinned_windows_installation_verified: false as const,
    owner_windows_field_witnessed: false as const,
    production_vault_installed: false as const,
    credential_intake: "DISABLED" as const,
    document_intake: "DISABLED" as const,
    mfa_enforced: false as const,
    backup_restore_enabled: false as const,
    vault_operation: "DENY" as const,
    windows_owner_acceptance: "HOLD" as const,
    production_security_acceptance: "HOLD" as const,
  };
}
