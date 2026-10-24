import { describe, expect, it } from "vitest";
import { assessVaultRecoveryLedger, vaultRecoveryDenialCases, vaultRecoveryReviewStages } from "./vaultRecoveryLedgerReview";

describe("Build 129 recovery witness policy", () => {
  it("never enables recovery, checkpoints, files, MFA or vault operations even with forged claims", () => {
    const claims: Record<string, boolean>[] = [{}, { auditPassed: true, ownerApproved: true, windowsAccepted: true, validMfa: true }];
    for (const input of claims) {
      const p = assessVaultRecoveryLedger(input);
      expect(p.phase).toBe("HYPOTHETICAL_LEDGER_TESTS_ONLY");
      expect(p.independent_trust_anchor_installed).toBe(false);
      expect(p.atomic_commit_installed).toBe(false);
      expect(p.version_witness_persistent).toBe(false);
      expect(p.encrypted_backup_installed).toBe(false);
      expect(p.offline_restore_enabled).toBe(false);
      expect(p.document_intake).toBe("DISABLED");
      expect(p.vault_operation).toBe("DENY");
      expect(p.mfa_enforced).toBe(false);
      expect(p.windows_owner_acceptance).toBe("HOLD");
      expect(p.production_security_acceptance).toBe("HOLD");
    }
  });

  it("enumerates independent witness, atomic commits, restore and negative evidence", () => {
    expect(vaultRecoveryReviewStages.map(x => x.id)).toEqual(["witness", "commit", "restore", "backup", "recovery_identity", "field"]);
    expect(vaultRecoveryDenialCases.map(x => x.id)).toEqual(["old_snapshot", "same_version_conflict", "no_witness", "cross_owner", "race_crash", "forged_evidence"]);
    expect(vaultRecoveryReviewStages.every(x => x.requirement.length > 90)).toBe(true);
  });
});
