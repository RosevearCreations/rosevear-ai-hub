import { describe, expect, it } from "vitest";
import { encodeOwnerReviewCheckpoint, parseOwnerReviewCheckpoint, type OwnerReviewCheckpoint } from "./ownerReviewCheckpoint";

const valid: Omit<OwnerReviewCheckpoint, "schema"> = {
  findings: { front_end: "needs_change", it: "not_checked", management: "not_checked", statistics: "not_checked", status: "acceptable" },
  issues: { front_end: "navigation", it: "none", management: "none", statistics: "none", status: "none" },
  followups: { front_end: "open", it: "none", management: "none", statistics: "none", status: "none" },
  deviceContext: "remote_windows_client",
  deviceFindings: { navigation: "observed_fail", resize: "observed_pass", keyboard: "not_checked", data: "not_checked", refresh: "not_checked" },
  deviceSymptoms: { navigation: "wrong_destination", resize: "none", keyboard: "none", data: "none", refresh: "none" },
  deviceRetests: { navigation: "issue_persists", resize: "not_retested", keyboard: "not_retested", data: "not_retested", refresh: "not_retested" },
  retestFollowups: { navigation: "engineering_review_requested", resize: "not_requested", keyboard: "not_requested", data: "not_requested", refresh: "not_requested" },
};

describe("Build 203 fixed-choice owner checkpoint safety", () => {
  it("round-trips only bounded and versioned fixed-choice owner observations", () => {
    const encoded = encodeOwnerReviewCheckpoint(valid);
    expect(encoded).not.toContain("password");
    expect(parseOwnerReviewCheckpoint(encoded)).toEqual({ schema: "rosevear.build203.owner-review-checkpoint.v1", ...valid });
  });

  it("rejects unknown values, stale device combinations and unbounded text", () => {
    expect(parseOwnerReviewCheckpoint(null)).toBeNull();
    expect(parseOwnerReviewCheckpoint("not JSON")).toBeNull();
    expect(parseOwnerReviewCheckpoint("x".repeat(6001))).toBeNull();
    expect(parseOwnerReviewCheckpoint(JSON.stringify({ ...valid, schema: "rosevear.build203.owner-review-checkpoint.v1", password: "SECRET" }))).toBeNull();
    expect(parseOwnerReviewCheckpoint(encodeOwnerReviewCheckpoint({ ...valid, deviceContext: "not_checked" }))).toBeNull();
    expect(parseOwnerReviewCheckpoint(encodeOwnerReviewCheckpoint({ ...valid, deviceSymptoms: { ...valid.deviceSymptoms, resize: "focus_not_visible" } }))).toBeNull();
    expect(parseOwnerReviewCheckpoint(encodeOwnerReviewCheckpoint({ ...valid, findings: { ...valid.findings, status: "admin" as "acceptable" } }))).toBeNull();
  });

  it("never accepts retest claims for a non-Windows context", () => {
    expect(parseOwnerReviewCheckpoint(encodeOwnerReviewCheckpoint({ ...valid, deviceContext: "other_browser_device" }))).toBeNull();
  });
});
