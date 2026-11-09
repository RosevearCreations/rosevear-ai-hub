import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";
import { recordWindowsOwnerObservation287 } from "./windowsOwnerAcceptance287";
import {
  acknowledgeWindowsDrift288, acknowledgementMatches288, loadWindowsDriftAck288,
  prepareWindowsSigningRequest288, reviewWindowsDrift288, windowsDriftAckKey288,
} from "./windowsEvidenceHandoff288";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["python", "powershell"],
  chain_hops_inspected: 2, recovery_script_mentioned: false, process_predates_checkout_commit: false, launch_source: "unknown" };
function observed(now: number, sha = SHA_A, startup = "enabled") {
  return reviewWindowsLauncherEvidence({
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(now).toISOString(), inspector_observed_at_utc: new Date(now).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: sha, checkout_sha_candidate: sha,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: startup,
    web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
  }, now);
}

beforeEach(() => localStorage.clear());

describe("Build 288 offline Windows signing request", () => {
  it("creates only an unsigned, SHA-256-bound candidate aligned to the published Master Shell v1 IDs", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now();
    const review = observed(now);
    const { records } = recordWindowsOwnerObservation287(localStorage, "ree", [], review, "owner_reported_working", true, now);
    const request = await prepareWindowsSigningRequest288(records, review, null, now);
    expect(request?.schema).toBe("rosevear.ai-hub.windows-evidence-signing-request.v1");
    expect(request?.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    const bytes = new TextEncoder().encode(JSON.stringify(request!.content));
    const digest = await webcrypto.subtle.digest("SHA-256", bytes);
    expect(request?.contentSha256).toBe(Buffer.from(digest).toString("hex"));
    expect(request?.signing.signature).toBeNull();
    expect(request?.masterShellContract).toMatchObject({
      schema: "rosevear.master-shell.event.v1", schemaVersion: "1.0.0",
      sourceId: "rosevear-ai-hub", shellId: "rosevear-ai-hub", tenantId: null,
      eventType: "audit.evidence.recorded", audience: ["ai-data-platform"], verificationState: "held",
    });
    expect(request?.published).toBe(false);
    expect(JSON.stringify(request)).not.toContain("ree");
    expect(JSON.stringify(request)).not.toContain("127.0.0.1");
    expect(JSON.stringify(request)).not.toContain("token");
    vi.unstubAllGlobals();
  });

  it("requires explicit, owner-scoped, sample-bound acknowledgement for current drift", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now();
    const first = observed(now);
    const { records } = recordWindowsOwnerObservation287(localStorage, "ree", [], first, "owner_reported_working", true, now);
    const current = observed(now + 100, SHA_B);
    expect(reviewWindowsDrift288(records, current, now + 100).state).toBe("DRIFT_NEEDS_ACKNOWLEDGEMENT");
    expect(await prepareWindowsSigningRequest288(records, current, null, now + 100)).toBeNull();
    expect(acknowledgeWindowsDrift288(localStorage, "ree", records, current, false, now + 100)).toBeNull();
    const ack = acknowledgeWindowsDrift288(localStorage, "ree", records, current, true, now + 100);
    expect(ack?.changes).toEqual(["UPDATER_RELEASE_CHANGED", "CHECKOUT_CHANGED"]);
    expect(acknowledgementMatches288(ack, records, current, now + 100)).toBe(true);
    expect(loadWindowsDriftAck288(localStorage, "jack")).toBeNull();
    const request = await prepareWindowsSigningRequest288(records, current, ack, now + 100);
    expect(request?.content.driftReview).toBe("owner_acknowledged_unverified");
    expect(request?.signing.state).toContain("AWAITING_APPROVED");
    expect(await prepareWindowsSigningRequest288(records, current, ack, now + 6 * 60_000)).toBeNull();
    expect(acknowledgementMatches288(ack, records, observed(now + 101, SHA_B), now + 101)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("preserves unacknowledged prior recorded drift even when a newer comparison is stable", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now();
    const first = recordWindowsOwnerObservation287(localStorage, "ree", [], observed(now), "owner_reported_working", true, now).records;
    const second = recordWindowsOwnerObservation287(localStorage, "ree", first, observed(now + 10, SHA_B), "owner_reported_issue", true, now + 10).records;
    const review = observed(now + 20, SHA_B);
    expect(reviewWindowsDrift288(second, review, now + 20)).toMatchObject({
      state: "DRIFT_NEEDS_ACKNOWLEDGEMENT", comparison: "recorded_transition",
    });
    expect(await prepareWindowsSigningRequest288(second, review, null, now + 20)).toBeNull();
    const ack = acknowledgeWindowsDrift288(localStorage, "ree", second, review, true, now + 20);
    expect(ack?.comparison).toBe("recorded_transition");
    expect((await prepareWindowsSigningRequest288(second, review, ack, now + 20))?.content.observedDrift).toEqual([
      "UPDATER_RELEASE_CHANGED", "CHECKOUT_CHANGED",
    ]);
    vi.unstubAllGlobals();
  });

  it("rejects forged stored acknowledgement and stale or failed digest", async () => {
    const now = Date.now();
    const first = recordWindowsOwnerObservation287(localStorage, "ree", [], observed(now), "owner_reported_working", true, now).records;
    const changed = observed(now + 20, SHA_B);
    const ack = acknowledgeWindowsDrift288(localStorage, "ree", first, changed, true, now + 20)!;
    const key = windowsDriftAckKey288("ree")!;
    localStorage.setItem(key, JSON.stringify({ ...ack, changes: ["UNSAFE_FORCE_GREEN"] }));
    expect(loadWindowsDriftAck288(localStorage, "ree")).toBeNull();
    localStorage.setItem(key, JSON.stringify({ ...ack, signerPrivateKey: "SECRET" }));
    expect(JSON.stringify(loadWindowsDriftAck288(localStorage, "ree"))).not.toContain("SECRET");
    expect(await prepareWindowsSigningRequest288(first, changed, null, now + 20)).toBeNull();
    await expect(prepareWindowsSigningRequest288(first, observed(now + 20), null, now + 20,
      async () => new ArrayBuffer(10))).rejects.toThrow("SIGNING_REQUEST_DIGEST_INVALID");
    expect(await prepareWindowsSigningRequest288(first, changed, ack, now + 32 * 24 * 60 * 60_000)).toBeNull();
  });
});
