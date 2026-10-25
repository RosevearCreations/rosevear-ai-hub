import { describe, expect, it } from "vitest";
import {
  assessVaultAssessorHandoff, inspectSyntheticAssessorHandoff, SYNTHETIC_HANDOFF_SCHEMA,
  vaultAssessorHandoffDenials, vaultAssessorHandoffScopes, type SyntheticAssessorHandoff,
} from "./vaultAssessorHandoff";

const fixture = (): SyntheticAssessorHandoff => ({
  schema: SYNTHETIC_HANDOFF_SCHEMA,
  environment: "IN_MEMORY_SIMULATION",
  artifact: "DEMO_ARTIFACT_ONLY",
  controls: vaultAssessorHandoffScopes.map(({ id }) => ({ id, state: "SIMULATED_PREPARED", provenance: "SYNTHETIC" })),
});

describe("Build 132 independent assessor handoff without vault authorization", () => {
  it("keeps every real operation denied even for forged auditor clearance, pilot or install", () => {
    for (const claims of [undefined, {}, { externalReview: "PASS", ownerAccepted: true, binaryVerified: true, deploy: true }]) {
      const gate = assessVaultAssessorHandoff(claims);
      expect(gate.phase).toBe("ASSESSOR_HANDOFF_PREPARATION_ONLY");
      expect(gate.independent_reviewer_engaged).toBe(false);
      expect(gate.actual_vault_source_audited).toBe(false);
      expect(gate.windows_artifact_verified).toBe(false);
      expect(gate.real_evidence_received).toBe(false);
      expect(gate.real_findings_retested).toBe(false);
      expect(gate.owner_pilot_authorized).toBe(false);
      expect(gate.windows_vault_installed).toBe(false);
      expect(gate.credential_intake).toBe("DISABLED");
      expect(gate.document_intake).toBe("DISABLED");
      expect(gate.mfa_enforced).toBe(false);
      expect(gate.backup_restore_enabled).toBe(false);
      expect(gate.vault_operation).toBe("DENY");
      expect(gate.windows_owner_acceptance).toBe("HOLD");
      expect(gate.production_security_acceptance).toBe("HOLD");
    }
  });

  it("can classify fictional completeness but never an independent assessment", () => {
    expect(inspectSyntheticAssessorHandoff(fixture())).toEqual({ classification: "SYNTHETIC_HANDOFF_PREPARED_NOT_REVIEWED", missing_scopes: 0, production_security_acceptance: "HOLD" });
    const missing = fixture();
    missing.controls[2].state = "MISSING";
    missing.controls[6].state = "MISSING";
    expect(inspectSyntheticAssessorHandoff(missing)).toEqual({ classification: "SYNTHETIC_HANDOFF_INCOMPLETE", missing_scopes: 2, production_security_acceptance: "HOLD" });
    missing.controls.reverse();
    expect(inspectSyntheticAssessorHandoff(missing).missing_scopes).toBe(2);
  });

  it("rejects missing, duplicate, unknown and extra scopes", () => {
    const good = fixture();
    const duplicate = fixture(); duplicate.controls[1].id = duplicate.controls[0].id;
    const missing = fixture(); missing.controls.pop();
    const extra = fixture(); extra.controls.push({ ...extra.controls[0] });
    const unknown = fixture(); (unknown.controls[0] as { id: string }).id = "secret_entry";
    for (const bad of [duplicate, missing, extra, unknown]) {
      expect(inspectSyntheticAssessorHandoff(bad).classification).toBe("INVALID_SYNTHETIC_HANDOFF");
    }
    expect(good.controls.length).toBe(8);
  });

  it("rejects real artifact assertions, forged signoffs, secrets and unapproved states", () => {
    const good = fixture();
    for (const bad of [
      { ...good, ownerSigned: true },
      { ...good, environment: "WINDOWS_PRODUCTION" },
      { ...good, artifact: "4e1fe0b581463e856e96b091bf9c19a433019867" },
      { ...good, schema: "rosevear-vault-synthetic-assessor-handoff/v2" },
      { ...good, controls: good.controls.map((c, i) => i ? c : { ...c, assessorSignature: "forged" }) },
      { ...good, controls: good.controls.map((c, i) => i ? c : { ...c, privateDocument: "secret" }) },
      { ...good, controls: good.controls.map((c, i) => i ? c : { ...c, provenance: "INDEPENDENT" }) },
      { ...good, controls: good.controls.map((c, i) => i ? c : { ...c, state: "PASSED_AUDIT" }) },
      { ...good, controls: good.controls.map((c, i) => i ? c : { ...c, state: "NOT_APPLICABLE" }) },
      null,
      [],
    ]) expect(inspectSyntheticAssessorHandoff(bad).classification).toBe("INVALID_SYNTHETIC_HANDOFF");
  });

  it("maps all security boundaries and denial scenarios for the actual assessor handoff", () => {
    expect(vaultAssessorHandoffScopes.map(({ id }) => id)).toEqual([
      "review_scope", "source_artifact", "dependencies", "key_identity", "windows_network", "document_recovery", "negative_tests", "owner_boundary",
    ]);
    expect(vaultAssessorHandoffDenials.map(({ id }) => id)).toEqual([
      "uncommissioned", "stale_build", "missing_scope", "secret_receipt", "co_rollback", "false_pilot",
    ]);
    expect(vaultAssessorHandoffScopes.every(s => s.requirement.length > 95 && s.responsibility.length > 10)).toBe(true);
  });
});
