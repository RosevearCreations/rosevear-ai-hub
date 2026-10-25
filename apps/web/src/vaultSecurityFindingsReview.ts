/** Build 131: a read-only remediation model. No real assessor submissions or sign-off. */
export const VAULT_FINDINGS_REVIEW_SCHEMA = "rosevear-vault-independent-findings-review/v1" as const;
export const SYNTHETIC_FINDINGS_SCHEMA = "rosevear-vault-synthetic-findings/v1" as const;

export const vaultRemediationReviewStages = [
  { id: "audit_scope", title: "Independent assessor scope and identity", requirement: "Before any review, commission a reviewer independent of the implementer; define the pinned source, exact libraries, Windows service, household identity, document pipeline and private recovery boundaries. No reviewer is engaged yet." },
  { id: "evidence", title: "Sanitized finding and reproducible evidence", requirement: "Each real finding needs an independent private evidence location, affected reviewed artifact, control mapping, minimal reproduction steps and impact. Never add passwords, personal file names, key material or recovery codes to Hub or GitHub." },
  { id: "severity", title: "Severity and exploitability triage", requirement: "Classify demonstrated impact and exposure, prioritize critical/high findings, and hold the pilot for unresolved authorization bypass, plaintext leakage, key exposure, rollback, network or Windows isolation weaknesses." },
  { id: "remediation", title: "Assigned remediation and change boundary", requirement: "Each required fix must identify an accountable engineering owner, bounded scope, impacted dependencies and fresh source revision. A GitHub merge, waived checklist or Hub owner role cannot mark an independent finding resolved." },
  { id: "retest", title: "Independent retest and regression evidence", requirement: "The original issue and adjacent negative cases need a reviewer-observed retest against an exact rebuilt artifact; changed binaries or settings reopen earlier outcomes until the reviewer reconciles them." },
  { id: "handoff", title: "Separate pilot decision and Windows acceptance", requirement: "Retested findings only form a future review packet. A separate explicit owner approval, disposable Windows installation and supervised field observations remain required before any live vault authority can be considered." },
] as const;

export const vaultRemediationDenials = [
  { id: "fake_reviewer", title: "Self-asserted external auditor sign-off", expected: "Synthetic or self-authored audit claims cannot constitute independent assessment, regardless of actor, checkbox, signature-shaped text or purported MFA." },
  { id: "high_open", title: "Critical or high vulnerability still open", expected: "Any unresolved secret-exposure, bypass, remote access, rollback or recovery defect blocks an isolated pilot pending independent retest." },
  { id: "waiver", title: "Risk accepted or waived in a UI flag", expected: "A Hub admin or owner flag cannot turn an outstanding issue into a verified fix, and no exception can silently authorize live data." },
  { id: "stale_artifact", title: "Retest on a different executable", expected: "Rebuilt binary, changed dependency, Windows ACL or private origin needs reconciliation against the reviewed release before old findings can be closed." },
  { id: "sensitive_receipt", title: "Secret, document or personal data attached", expected: "Reject reports carrying passwords, raw token/key values, filenames, account identifiers, MFA recovery material or file content in the Hub source/review packet." },
  { id: "empty_audit", title: "Empty or perfectly passing synthetic ledger", expected: "No findings, or every invented finding marked retested, still does not prove an external audit or actual Windows owner acceptance." },
] as const;

export type VaultFindingGate = (typeof vaultRemediationReviewStages)[number]["id"];
export type VaultFindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type VaultFindingDisposition = "OPEN" | "FIX_PROPOSED" | "RETEST_REQUIRED" | "SIMULATED_RETEST_PASS";

export type SyntheticFindingPacket = {
  schema: typeof SYNTHETIC_FINDINGS_SCHEMA;
  environment: "IN_MEMORY_SIMULATION";
  source_revision: "SIMULATED_SOURCE";
  findings: { id: string; gate: VaultFindingGate; severity: VaultFindingSeverity; disposition: VaultFindingDisposition; provenance: "SYNTHETIC" }[];
};

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]) =>
  Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** Reject unknown fields and all real-world evidence: this is only an invented issue ledger. */
export function triageSyntheticVaultFindings(value: unknown) {
  const invalid = { classification: "INVALID_SYNTHETIC_PACKET" as const, blockers: 0, pending_retests: 0, production_security_acceptance: "HOLD" as const };
  if (!isRecord(value) || !hasExactKeys(value, ["schema", "environment", "source_revision", "findings"])) return invalid;
  if (value.schema !== SYNTHETIC_FINDINGS_SCHEMA || value.environment !== "IN_MEMORY_SIMULATION" || value.source_revision !== "SIMULATED_SOURCE") return invalid;
  if (!Array.isArray(value.findings) || value.findings.length > 12) return invalid;
  const seen = new Set<string>();
  let blockers = 0;
  let pending_retests = 0;
  for (const item of value.findings) {
    if (!isRecord(item) || !hasExactKeys(item, ["id", "gate", "severity", "disposition", "provenance"])) return invalid;
    if (typeof item.id !== "string" || !/^DEMO-[0-9]{3}$/.test(item.id) || seen.has(item.id)) return invalid;
    if (!vaultRemediationReviewStages.some(stage => stage.id === item.gate) || item.provenance !== "SYNTHETIC") return invalid;
    if (!["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(String(item.severity))) return invalid;
    if (!["OPEN", "FIX_PROPOSED", "RETEST_REQUIRED", "SIMULATED_RETEST_PASS"].includes(String(item.disposition))) return invalid;
    seen.add(item.id);
    if (item.disposition !== "SIMULATED_RETEST_PASS") {
      pending_retests++;
      if (item.severity === "CRITICAL" || item.severity === "HIGH") blockers++;
    }
  }
  return {
    classification: blockers > 0 ? "SYNTHETIC_BLOCKERS" as const
      : pending_retests > 0 ? "SYNTHETIC_RETEST_PENDING" as const
      : "NO_OPEN_SYNTHETIC_FINDINGS_NOT_AN_AUDIT" as const,
    blockers,
    pending_retests,
    production_security_acceptance: "HOLD" as const,
  };
}

/** Even fabricated independent reviews or signed field checks have zero release authority. */
export function assessVaultSecurityFindingsReview(_untrustedClaims?: Record<string, unknown>) {
  return {
    schema: VAULT_FINDINGS_REVIEW_SCHEMA,
    phase: "INDEPENDENT_REVIEW_PREPARATION_ONLY" as const,
    independent_audit_conducted: false as const,
    real_findings_collected: false as const,
    independent_retest_observed: false as const,
    reviewer_signoff_accepted: false as const,
    owner_windows_pilot_approved: false as const,
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
