import {describe, expect, it} from "vitest";
import {canonicalSignedRelease250, parseSignedRelease250, recoveryDecision250, verifySignedRelease250} from "./signedRelease250";

const time = "2026-11-05T00:00:00Z";
const expected = "a".repeat(40);
const artifact = "b".repeat(64);
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const hex = (bytes: Uint8Array) => Array.from(bytes).map(x => x.toString(16).padStart(2, "0")).join("");

describe("Build 250 signed installed provenance custody gate", () => {
  it("verifies synthetic Ed25519 signature but never authorizes recovery", async () => {
    const pair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const fingerprint = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)));
    const draft = {schema: "rosevear-windows-installed-release-250/v1", release_sha: expected, artifact_sha256: artifact,
      observed_at: time, signer_public_key_raw_base64: encode(raw), signature_base64: encode(new Uint8Array(64))};
    const signed = await crypto.subtle.sign("Ed25519", pair.privateKey, new TextEncoder().encode(canonicalSignedRelease250(parseSignedRelease250(JSON.stringify(draft)))));
    const receipt = parseSignedRelease250(JSON.stringify({...draft, signature_base64: encode(new Uint8Array(signed)), private_secret: "discard-this"}));
    expect(JSON.stringify(receipt)).not.toContain("discard-this");
    const verified = await verifySignedRelease250(receipt, fingerprint, expected, "2026-11-05T01:00:00Z");
    expect(verified.signature_valid).toBe(true);
    expect(verified.signer_pinned).toBe(true);
    expect(verified.state).toBe("SIGNED_SOURCE_CANDIDATE_ONLY");
    expect(verified.authorization).toBe(false);
    expect((await verifySignedRelease250(receipt, "0".repeat(64), expected, "2026-11-05T01:00:00Z")).state).toBe("SIGNATURE_OR_CUSTODY_HOLD");
    expect((await verifySignedRelease250(receipt, fingerprint, "c".repeat(40), "2026-11-05T01:00:00Z")).state).toBe("SIGNATURE_OR_CUSTODY_HOLD");
  });
  it("refuses malformed receipts and cannot execute recovery", () => {
    expect(() => parseSignedRelease250("{}" )).toThrow("schema");
    expect(() => parseSignedRelease250("x".repeat(8193))).toThrow("8 KB");
    expect(recoveryDecision250("drift_or_unknown", "supervised_recovery_review").restart_allowed).toBe(false);
    expect(recoveryDecision250("expected_script_reported", "inspect").closure_authorized).toBe(false);
  });
});
