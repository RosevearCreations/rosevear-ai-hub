import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reviewWindowsLauncherEvidence } from "./windowsLauncherEvidence286";
import { recordWindowsOwnerObservation287 } from "./windowsOwnerAcceptance287";
import { prepareWindowsSigningRequest288 } from "./windowsEvidenceHandoff288";
import { reviewOfflineWindowsHandoff289 } from "./windowsOfflineHandoffReview289";

const SHA_A = "a".repeat(40);
const process = { listener: "observed", chain_status: "partial_or_complete", ancestor_kinds: ["node"],
  chain_hops_inspected: 1, recovery_script_mentioned: false, process_predates_checkout_commit: false, launch_source: "unknown" };

async function fixture(now: number) {
  const review = reviewWindowsLauncherEvidence({
    schema: "rosevear.ai-hub.windows-launcher-evidence.v1", source: "LOCAL_READ_ONLY_INSPECTOR_259",
    observed_at_utc: new Date(now).toISOString(), inspector_observed_at_utc: new Date(now).toISOString(),
    host_platform: "WINDOWS", recorded_release_sha_candidate: SHA_A, checkout_sha_candidate: SHA_A,
    candidate_comparison: "CANDIDATES_MATCH", startup_task_state: "enabled",
    web_launcher: process, backend_launcher: process,
    installed_release_verified: false, original_device_verified: false, independent_witness_verified: false,
    master_shell_reporting_authorized: false, made_changes: false, external_requests: 0,
  }, now);
  const { records } = recordWindowsOwnerObservation287(localStorage, "ree", [], review,
    "owner_reported_working", true, now);
  return (await prepareWindowsSigningRequest288(records, review, null, now))!;
}

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("Build 289 offline handoff review", () => {
  it("checks a Build 288 digest without treating it as a signed or trusted receipt", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now(); const raw = JSON.stringify(await fixture(now));
    const result = await reviewOfflineWindowsHandoff289(raw, now);
    expect(result).toMatchObject({ state: "DIGEST_MATCH_UNVERIFIED", olderThanFiveMinutes: false,
      ownerOutcome: "owner_reported_working", releaseCandidate: SHA_A, driftAcknowledged: false });
    expect(JSON.stringify(result)).not.toContain("ree");
    expect(JSON.stringify(result)).not.toContain("trustedKeyFingerprint");
  });

  it("rejects a changed payload even when the original checksum is preserved", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now(); const request = await fixture(now);
    expect((await reviewOfflineWindowsHandoff289(JSON.stringify({ ...request,
      content: { ...request.content, ownerOutcome: "owner_reported_issue" },
    }), now))).toEqual({ state: "REJECTED", reason: "CONTENT_DIGEST_MISMATCH" });
    expect((await reviewOfflineWindowsHandoff289(JSON.stringify({ ...request,
      content: { ...request.content, privateOwnerId: "ree" },
    }), now))).toMatchObject({ state: "REJECTED", reason: "UNSUPPORTED_OR_UNSAFE_HANDOFF" });
  });

  it("rejects signer claims, modified scope, extra fields, missing crypto and malformed input", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now(); const request = await fixture(now);
    const rejected = async (value: unknown) => (await reviewOfflineWindowsHandoff289(JSON.stringify(value), now)).state;
    expect(await rejected({ ...request, published: true })).toBe("REJECTED");
    expect(await rejected({ ...request, signing: { ...request.signing, signature: "fake" } })).toBe("REJECTED");
    expect(await rejected({ ...request, masterShellContract: { ...request.masterShellContract,
      verificationState: "verified" } })).toBe("REJECTED");
    expect(await rejected({ ...request, masterShellContract: { ...request.masterShellContract,
      audience: ["comms-hub"] } })).toBe("REJECTED");
    expect(await rejected({ ...request, extraTransport: "https://example.com" })).toBe("REJECTED");
    expect(await reviewOfflineWindowsHandoff289("{bad json", now)).toMatchObject({ reason: "INVALID_JSON" });
    expect(await reviewOfflineWindowsHandoff289(" ".repeat(20_000), now)).toMatchObject({ reason: "SIZE_OR_CLOCK_INVALID" });
    expect(await reviewOfflineWindowsHandoff289(JSON.stringify(request), now,
      async () => { throw new Error("No crypto"); })).toMatchObject({ reason: "SECURE_DIGEST_UNAVAILABLE" });
    expect((await reviewOfflineWindowsHandoff289(JSON.stringify(request), now,
      async () => new ArrayBuffer(1))).state).toBe("REJECTED");
  });

  it("flags historical samples and rejects future or inconsistent timestamp claims", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const now = Date.now(); const request = await fixture(now);
    const raw = JSON.stringify(request);
    expect(await reviewOfflineWindowsHandoff289(raw, now + 6 * 60_000)).toMatchObject({
      state: "DIGEST_MATCH_UNVERIFIED", olderThanFiveMinutes: true,
    });
    expect(await reviewOfflineWindowsHandoff289(raw, now - 120_000)).toMatchObject({ reason: "INVALID_OBSERVATION_TIMES" });
  });
});
