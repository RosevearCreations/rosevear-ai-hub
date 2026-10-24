import { describe, expect, it } from "vitest";
import { assessVaultDocumentPreparation, vaultDocumentDenialCases, vaultDocumentReviewStages } from "./vaultDocumentPreparation";

describe("Build 128 document preparation policy", () => {
  it("denies all real document actions even if reviews and owner consent are forged", () => {
    const claimsList: Record<string, boolean>[] = [{}, { ownerApproved: true, reviewed: true, windowsAccepted: true, mfaEnabled: true }];
    for (const claims of claimsList) {
      const result = assessVaultDocumentPreparation(claims);
      expect(result.phase).toBe("SYNTHETIC_DOCUMENT_TESTS_ONLY");
      expect(result.accepted_fixture_kind).toBe("DISPOSABLE_BYTES_ONLY");
      expect(result.shipped_document_crypto).toBe(false);
      expect(result.document_picker).toBe("DISABLED");
      expect(result.document_upload).toBe("DISABLED");
      expect(result.document_storage).toBe("DISABLED");
      expect(result.private_preview).toBe("DISABLED");
      expect(result.document_download).toBe("DISABLED");
      expect(result.service_installed).toBe(false);
      expect(result.windows_field_acceptance).toBe("HOLD");
      expect(result.production_security_acceptance).toBe("HOLD");
    }
  });

  it("enumerates document isolation stages and negative acceptance cases", () => {
    expect(vaultDocumentReviewStages.map(stage => stage.id)).toEqual(["admission", "identity", "chunks", "preview", "recovery", "windows"]);
    expect(vaultDocumentDenialCases.map(item => item.id)).toEqual(["real_file", "tamper", "incomplete", "mixing", "replay"]);
    expect(vaultDocumentReviewStages.every(item => item.requirement.length > 80)).toBe(true);
  });
});
