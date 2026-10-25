import { describe, expect, it } from "vitest";
import {
  assessVaultSecurityFindingsReview, SYNTHETIC_FINDINGS_SCHEMA, triageSyntheticVaultFindings,
  vaultRemediationDenials, vaultRemediationReviewStages, type SyntheticFindingPacket,
} from "./vaultSecurityFindingsReview";

const invented = (): SyntheticFindingPacket => ({
  schema: SYNTHETIC_FINDINGS_SCHEMA,
  environment: "IN_MEMORY_SIMULATION",
  source_revision: "SIMULATED_SOURCE",
  findings: [
    { id: "DEMO-001", gate: "severity", severity: "CRITICAL", disposition: "OPEN", provenance: "SYNTHETIC" },
    { id: "DEMO-002", gate: "retest", severity: "LOW", disposition: "RETEST_REQUIRED", provenance: "SYNTHETIC" },
  ],
});

describe("Build 131 simulated independent-review findings and remediation holds", () => {
  it("denies live data and Windows authorization even with forged reviewer and owner approvals", () => {
    for (const claims of [undefined, {}, { independentAuditPassed: true, findingsWaived: true, ownerSigned: true, installed: true, mfa: true }]) {
      const s = assessVaultSecurityFindingsReview(claims);
      expect(s.independent_audit_conducted).toBe(false);
      expect(s.real_findings_collected).toBe(false);
      expect(s.independent_retest_observed).toBe(false);
      expect(s.reviewer_signoff_accepted).toBe(false);
      expect(s.owner_windows_pilot_approved).toBe(false);
      expect(s.windows_vault_installed).toBe(false);
      expect(s.credential_intake).toBe("DISABLED");
      expect(s.document_intake).toBe("DISABLED");
      expect(s.mfa_enforced).toBe(false);
      expect(s.backup_restore_enabled).toBe(false);
      expect(s.vault_operation).toBe("DENY");
      expect(s.windows_owner_acceptance).toBe("HOLD");
      expect(s.production_security_acceptance).toBe("HOLD");
    }
  });

  it("prioritizes invented unresolved critical/high findings without any release authority", () => {
    expect(triageSyntheticVaultFindings(invented())).toEqual({ classification: "SYNTHETIC_BLOCKERS", blockers: 1, pending_retests: 2, production_security_acceptance: "HOLD" });
    const packet = invented();
    packet.findings[0].disposition = "FIX_PROPOSED";
    expect(triageSyntheticVaultFindings(packet).classification).toBe("SYNTHETIC_BLOCKERS");
    packet.findings[0].disposition = "RETEST_REQUIRED";
    expect(triageSyntheticVaultFindings(packet).blockers).toBe(1);
  });

  it("does not accept low-only pending fixes, empty audit, or completed synthetic retest as real acceptance", () => {
    const packet = invented();
    packet.findings[0].disposition = "SIMULATED_RETEST_PASS";
    expect(triageSyntheticVaultFindings(packet)).toEqual({ classification: "SYNTHETIC_RETEST_PENDING", blockers: 0, pending_retests: 1, production_security_acceptance: "HOLD" });
    packet.findings[1].disposition = "SIMULATED_RETEST_PASS";
    expect(triageSyntheticVaultFindings(packet).classification).toBe("NO_OPEN_SYNTHETIC_FINDINGS_NOT_AN_AUDIT");
    packet.findings = [];
    expect(triageSyntheticVaultFindings(packet).classification).toBe("NO_OPEN_SYNTHETIC_FINDINGS_NOT_AN_AUDIT");
    expect(triageSyntheticVaultFindings(packet).production_security_acceptance).toBe("HOLD");
  });

  it("rejects duplicate issue IDs, fabricated release identities, untrusted reviewer fields and secret-bearing payloads", () => {
    const packet = invented();
    for (const wrong of [
      { ...packet, ownerSigned: true },
      { ...packet, environment: "WINDOWS_PRODUCTION" },
      { ...packet, source_revision: "f0778b4e313b3d95fc5f41a2b8785df89dc6e85d" },
      { ...packet, findings: [...packet.findings, { ...packet.findings[0] }] },
      { ...packet, findings: [{ ...packet.findings[0], id: "REAL-001" }] },
      { ...packet, findings: [{ ...packet.findings[0], gate: "secret_store" }] },
      { ...packet, findings: [{ ...packet.findings[0], severity: "WAIVED" }] },
      { ...packet, findings: [{ ...packet.findings[0], disposition: "RISK_ACCEPTED" }] },
      { ...packet, findings: [{ ...packet.findings[0], provenance: "EXTERNAL_REVIEW" }] },
      { ...packet, findings: [{ ...packet.findings[0], secret: "not-a-real-password" }] },
      { ...packet, findings: Array.from({ length: 13 }, (_, i) => ({ ...packet.findings[0], id: `DEMO-${String(i).padStart(3, "0")}` })) },
      null,
    ]) expect(triageSyntheticVaultFindings(wrong).classification).toBe("INVALID_SYNTHETIC_PACKET");
  });

  it("supports two distinct hypothetical findings with shared gate but unique IDs", () => {
    const packet = invented();
    packet.findings[1].gate = packet.findings[0].gate;
    expect(triageSyntheticVaultFindings(packet).pending_retests).toBe(2);
  });

  it("keeps independent review, retesting, owner pilot decision and mandatory holds explicit", () => {
    expect(vaultRemediationReviewStages.map(x => x.id)).toEqual(["audit_scope", "evidence", "severity", "remediation", "retest", "handoff"]);
    expect(vaultRemediationDenials.map(x => x.id)).toEqual(["fake_reviewer", "high_open", "waiver", "stale_artifact", "sensitive_receipt", "empty_audit"]);
    expect(vaultRemediationReviewStages.every(x => x.requirement.length > 90)).toBe(true);
  });
});
