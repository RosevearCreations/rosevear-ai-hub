/** Build 226: decision packet only, never a vault permission or security attestation. */
import { vaultReadinessMilestones } from "./vaultReadinessDashboard";

export const VAULT_DECISION_SCHEMA = "rosevear-vault-owner-decision/v1" as const;

export const vaultDesignPaths = [
  {
    id: "first_party",
    title: "Continue first-party, Windows-local design",
    benefit: "Own the feature set and private storage boundary; can adapt household sharing and documents.",
    cost: "We maintain crypto dependencies, emergency recovery, signed Windows releases and independent audits.",
    next: "Commission independent scope review, then implement with disposable test data only after separate authorization.",
  },
  {
    id: "review_provider",
    title: "Re-evaluate an independently reviewed keeper",
    benefit: "Existing mature clients and published security documentation may reduce implementation work.",
    cost: "Licensing, supported self-hosting, account isolation, MFA and offline restoration require current evidence.",
    next: "Evaluate the existing provider-decision criteria; do not install or migrate records automatically.",
  },
  {
    id: "defer",
    title: "Defer the vault entirely",
    benefit: "No new custody of household secrets or additional Windows service until resources are ready.",
    cost: "Continue using an existing trusted password manager with its own backups and recovery plan.",
    next: "Keep all vault code, secret intake and document upload disabled; revisit on explicit owner request.",
  },
] as const;

export type VaultDesignPath = typeof vaultDesignPaths[number]["id"];

export const vaultDecisionQuestions = [
  { id: "threats", title: "Threat model & boundaries", requirement: "Review stolen Windows disk, compromised Hub admin, lost household device, malware, replay and exposed backups; separate vault processes, origins and keys." },
  { id: "cryptography", title: "Encryption & key lifecycle", requirement: "Independently approve maintained AEAD and KDF libraries, key derivation, per-record/document contexts, key rotation, memory exposure and anti-rollback witness." },
  { id: "identity", title: "Independent identity & step-up", requirement: "Separate household identities, sharing grants and FIDO2/WebAuthn hardware key or passkey factors; no Hub-owner bypass or recovery-factor downgrade." },
  { id: "isolation", title: "Windows and local network isolation", requirement: "Audit dedicated least-privilege service/ACLs, distinct HTTPS origin, Caddy certificates, restricted firewall and Tailscale device policies." },
  { id: "recovery", title: "Backup, failure and recovery", requirement: "Rehearse lost factors, database corruption, incomplete backup, key loss, co-rollback and isolated restore with independently held escrow; never test on live family data." },
  { id: "assessor", title: "Independent assessor & owner pilot", requirement: "Commission review of pinned source, dependencies, Windows artifact and negative tests; close severe findings; separately authorize witnessed disposable-data pilot." },
] as const;

export const vaultFailureCases = [
  "Lost passkey and second factor: recover only with separately custody-controlled owner procedure; never through Hub administrator access.",
  "Missing or incorrect archive key: restore must fail closed without leaking plaintext or changing the running vault.",
  "Corrupted or incomplete backup: reject integrity failure and preserve original installation for rollback.",
  "Database and local ledger restored to an old version: detect replay using an independent version witness.",
  "Stolen or revoked family device: reject previous sessions and factor credentials; review shared-record revocation.",
  "Windows reboot or Caddy/Tailscale outage: keep vault locked and inaccessible until independently verified recovery.",
] as const;

/** Owner preference and paper review can never satisfy independent evidence. */
export function assessVaultDecisionGate(
  preference: VaultDesignPath | null = null,
  reviewedQuestions: readonly string[] = [],
  _untrustedProof?: Record<string, unknown>,
) {
  const validPreference = vaultDesignPaths.some(option => option.id === preference) ? preference : null;
  const reviewed = vaultDecisionQuestions.filter(question => reviewedQuestions.includes(question.id)).length;
  return {
    schema: VAULT_DECISION_SCHEMA,
    preference: validPreference,
    review_progress: { reviewed, total: vaultDecisionQuestions.length },
    required_security_gates: vaultReadinessMilestones.length,
    independently_verified_security_gates: 0 as const,
    independent_assessor_engaged: false as const,
    owner_pilot_authorized: false as const,
    credential_intake: "DISABLED" as const,
    document_intake: "DISABLED" as const,
    vault_service_installed: false as const,
    production_security_acceptance: "HOLD" as const,
  };
}
