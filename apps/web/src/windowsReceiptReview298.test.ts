import { describe, expect, it } from "vitest";
import { prepareFieldPacket297 } from "./windowsFieldPacket297";
import { recordOwnerChecklist296 } from "./windowsCustodyReview296";
import { inspectFieldPacket298, recordOwnerTriage298 } from "./windowsReceiptReview298";
import type { CustodyNote295 } from "./windowsCustodyHandoff295";

const SHA = "a".repeat(40);
const NOW = Date.parse("2026-11-10T03:00:00.000Z");
const note: CustodyNote295 = {
  reviewedAtUtc: "2026-11-10T02:50:00.000Z",
  source: "BROWSER_SESSION_OWNER_REPORTED_CHAIN_ONLY", sourceSha: SHA,
  unsignedDigest: "b".repeat(64), localIntakeAtUtc: "2026-11-10T02:40:00.000Z",
  supervisedReviewAtUtc: "2026-11-10T02:45:00.000Z",
  supervisedAction: "REVIEW_ORIGINAL_HOST",
  linkage: "SOURCE_AND_TIME_CORRELATION_ONLY",
  authority: "OWNER_ACKNOWLEDGED_DRY_RUN_ONLY",
  verifiedRegistryRecords: 0, independentlyVerifiedGates: 0,
  physicalHostAccepted: false, cryptographicReceiptVerified: false,
  masterShellPublisherAuthorized: false,
};
const checklist = recordOwnerChecklist296({ note, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW - 60_000 })!;
const packet = prepareFieldPacket297({ note, checklist, expectedMainSha: SHA,
  acknowledged: true, nowMs: NOW })!;
const inspect = (value: unknown, sha = SHA, time = NOW) =>
  inspectFieldPacket298(JSON.stringify(value), sha, time);

describe("Build 298 independent field packet schema and exception triage", () => {
  it("accepts only the review format while keeping trust and connection HOLD", () => {
    const result = inspect(packet);
    expect(result.state).toBe("REVIEW_ONLY_HOLD");
    expect(result.issues).toEqual(["INDEPENDENT_PROOF_MISSING"]);
    expect(result.sourceIdentity).toBe("rosevear-ai-hub");
    expect(result.sourceSignerVerified).toBe(false);
    expect(result.shellAuthorized).toBe(false);
    expect(result.verifiedReceipts).toBe(0);
  });
  it("rejects malformed, oversized, identity-spoofed, trust-positive, extra-field and swapped sources", () => {
    expect(inspectFieldPacket298("", SHA, NOW).issues).toEqual(["PACKET_MISSING"]);
    expect(inspectFieldPacket298("{", SHA, NOW).state).toBe("REJECTED_HOLD");
    expect(inspectFieldPacket298("x".repeat(24577), SHA, NOW).state).toBe("REJECTED_HOLD");
    for (const changed of [
      { ...packet, originalHostVerified: true },
      { ...packet, sourceSha: "invalid" },
      { ...packet, arbitrary: "pass" },
      { ...packet, sourceMapping: [...packet.sourceMapping].reverse() },
      { ...packet, sourceMapping: packet.sourceMapping.map((s, i) => i ? s : { ...s, connection: "CONNECTED" }) },
      { ...packet, evidenceRequirements: packet.evidenceRequirements.slice(1) },
      { ...packet, verifiedReceipts: 1 },
    ]) expect(inspect(changed).issues).toEqual(["SCHEMA_INVALID"]);
  });
  it("flags revision drift and stale packet but never elevates to connection", () => {
    const drift = inspect(packet, "c".repeat(40), NOW + 31 * 60_000);
    expect(drift.issues).toEqual(["SOURCE_REVISION_DRIFT", "PACKET_STALE", "INDEPENDENT_PROOF_MISSING"]);
    expect(drift.shellAuthorized).toBe(false);
  });
  it("requires current observed issue and owner acknowledgement for OPEN triage", () => {
    const review = inspect(packet);
    const input = { issue: "INDEPENDENT_PROOF_MISSING" as const,
      observedIssues: review.issues, expectedMainSha: SHA, nowMs: NOW, acknowledged: true };
    expect(recordOwnerTriage298({ ...input, acknowledged: false })).toBeNull();
    expect(recordOwnerTriage298({ ...input, issue: "SCHEMA_INVALID" })).toBeNull();
    expect(recordOwnerTriage298(input)).toMatchObject({
      disposition: "OWNER_REVIEW_REQUIRED_OPEN_HOLD",
      independentReceiptVerified: false, connectionAuthorized: false,
    });
  });
});

