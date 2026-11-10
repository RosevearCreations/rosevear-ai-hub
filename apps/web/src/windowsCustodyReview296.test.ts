import { describe, expect, it } from "vitest";
import type { CustodyNote295, HandoffDryRun295 } from "./windowsCustodyHandoff295";
import {
  deriveCustodyExceptions296, FIELD_RECEIPT_CHECKLIST_296, recordCustodyException296,
  recordOwnerChecklist296, projectShellEvidenceReadiness296, exportCustodyExceptions296,
} from "./windowsCustodyReview296";
const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T02:15:00.000Z");
const note: CustodyNote295 = {
  reviewedAtUtc: "2026-11-10T02:10:00.000Z",
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
  unsignedDigest: "b".repeat(64),
  localIntakeAtUtc: "2026-11-10T02:00:00.000Z",
  supervisedReviewAtUtc: "2026-11-10T02:05:00.000Z",
  supervisedAction: "REVIEW_ORIGINAL_HOST",
  linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
  verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
  physicalHostAccepted: false, cryptographicReceiptVerified: false,
  masterShellPublisherAuthorized: false,
};
const dryRun: HandoffDryRun295 = {
  schema: "rosevear.ai-hub.windows-handoff-dry-run.v1",
  simulatedAtUtc: "2026-11-10T02:12:00.000Z",
  destination: "AI_DATA_PLATFORM_READ_ONLY_REVIEW", sourceSha: SHA,
  source: "OWNER_CUSTODY_METADATA_UNVERIFIED",
  decision: "BLOCKED_UNVERIFIED_ORIGINAL_EVIDENCE",
  missingIndependentAuthorities: 7, registryConnected: false,
  transport: "DISABLED", messagesSent: 0, verifiedReceipts: 0,
  masterShellAuthorized: false,
};
const base = { notes: [note], dryRuns: [dryRun], expectedMainSha: SHA, nowMs: NOW };
describe("Build 296 independent Windows custody exception register", () => {
  it("only derives open issues from source-matched local observations", () => {
    expect(deriveCustodyExceptions296(base)).toEqual(["UNVERIFIED_ORIGINAL_EVIDENCE"]);
    expect(deriveCustodyExceptions296({ ...base, notes: [] })).toContain("NO_OWNER_CUSTODY_NOTE");
    expect(deriveCustodyExceptions296({ ...base, dryRuns: [] })).toContain("NO_OPERATOR_HANDOFF_DRY_RUN");
    expect(deriveCustodyExceptions296({ ...base, nowMs: NOW + 31 * 60_000 }))
      .toContain("STALE_OWNER_CUSTODY_NOTE");
    expect(deriveCustodyExceptions296({ ...base, expectedMainSha: "c".repeat(40) }))
      .toContain("NO_OWNER_CUSTODY_NOTE");
  });
  it("requires current observed exception and owner acknowledgement", () => {
    const input = { ...base, code: "UNVERIFIED_ORIGINAL_EVIDENCE" as const, acknowledged: true };
    expect(recordCustodyException296({ ...input, acknowledged: false })).toBeNull();
    expect(recordCustodyException296({ ...input, code: "NO_OWNER_CUSTODY_NOTE" })).toBeNull();
    expect(recordCustodyException296({ ...input, expectedMainSha: "invalid" })).toBeNull();
    const result = recordCustodyException296(input);
    expect(result?.state).toBe("OPEN_OWNER_REVIEW_HOLD");
    expect(result?.fieldReceiptAccepted).toBe(false);
    expect(result?.independentVerificationCount).toBe(0);
    expect(result?.shellAuthorized).toBe(false);
  });
  it("never treats owner-approved checklist as signed consent, receipt or verification", () => {
    expect(FIELD_RECEIPT_CHECKLIST_296).toHaveLength(7);
    expect(recordOwnerChecklist296({ note, expectedMainSha: SHA,
      acknowledged: false, nowMs: NOW })).toBeNull();
    expect(recordOwnerChecklist296({ note: null, expectedMainSha: SHA,
      acknowledged: true, nowMs: NOW })).toBeNull();
    expect(recordOwnerChecklist296({ note: { ...note, physicalHostAccepted: true } as unknown as CustodyNote295,
      expectedMainSha: SHA, acknowledged: true, nowMs: NOW })).toBeNull();
    const result = recordOwnerChecklist296({ note, expectedMainSha: SHA,
      acknowledged: true, nowMs: NOW });
    expect(result?.ownerDecision).toBe("APPROVE_CHECKLIST_FOR_FIELD_REVIEW_ONLY");
    expect(result?.gateStates).toHaveLength(7);
    expect(result?.gateStates.every(g => g.state === "INDEPENDENT_PROOF_NOT_RECEIVED")).toBe(true);
    expect(result?.signedOwnerConsentVerified).toBe(false);
    expect(result?.receiptAccepted).toBe(false);
    expect(result?.shellAuthorized).toBe(false);
  });
  it("shell projections remain read only even when review metadata is complete", () => {
    const checklist = recordOwnerChecklist296({ note, expectedMainSha: SHA,
      acknowledged: true, nowMs: NOW })!;
    const exception = recordCustodyException296({ ...base,
      code: "UNVERIFIED_ORIGINAL_EVIDENCE", acknowledged: true })!;
    const preview = projectShellEvidenceReadiness296({
      ...base, checklists: [checklist], exceptions: [exception],
    });
    expect(preview.reviewMetadataState).toBe("REVIEW_CHECKLIST_PREPARED_HOLD");
    expect(preview.sourceRegistryConnection).toBe("NOT_CONNECTED");
    expect(preview.productionAuthorized).toBe(false);
    expect(preview.verifiedEvidenceCount).toBe(0);
    expect(preview.acceptedReceipts).toBe(0);
    expect(preview.messagesSent).toBe(0);
    expect(preview.activeExceptionCodes).toContain("UNVERIFIED_ORIGINAL_EVIDENCE");
    const report = exportCustodyExceptions296(Array(25).fill(exception), Array(15).fill(checklist));
    expect(report.exceptions).toHaveLength(20);
    expect(report.checklists).toHaveLength(10);
    expect(report.actualSignedReceipts).toBe(0);
  });
});
