import { importArtifact251, mapArtifact251 } from "./artifactCustody251";
import { describe, expect, it } from "vitest";

const digest = "a".repeat(64);
const sha = "b".repeat(40);
const observed_at = "2026-11-04T20:00:00.000Z";
const fixture = {schema: "rosevear-windows-artifact-251/v1", observed_at, asset: "web_index_html", exists: true,
  sha256: digest, signer_authenticated: false, release_verified: false};

describe("Build 251 fail-closed signer and Windows artifact custody", () => {
  it("imports a narrowly scoped digest without elevating trust", () => {
    expect(importArtifact251(JSON.stringify(fixture))).toEqual(fixture);
    expect(() => importArtifact251(JSON.stringify({...fixture, signer_authenticated: true}))).toThrow();
    expect(() => importArtifact251(JSON.stringify({...fixture, release_verified: true}))).toThrow();
    expect(() => importArtifact251(JSON.stringify({...fixture, sha256: "../../escape"}))).toThrow();
    expect(() => importArtifact251("{" + " ".repeat(4096) + "}")).toThrow();
  });
  it("holds even on a fresh candidate hash match and claimed custodian", () => {
    const artifact = importArtifact251(JSON.stringify(fixture));
    const result = mapArtifact251(sha, digest, artifact, "2026-11-04T20:10:00.000Z", true, true);
    expect(result.artifact_matches).toBe(true);
    expect(result.fresh).toBe(true);
    expect(result.disposition).toBe("RECOVERY_RECEIPT_CUSTODY_HOLD");
    expect(result.enrollment_authorized).toBe(false);
    expect(result.recovery_authorized).toBe(false);
    expect(result.installation_verified).toBe(false);
  });
  it("rejects stale or missing artifact evidence", () => {
    const artifact = importArtifact251(JSON.stringify(fixture));
    expect(mapArtifact251(sha, digest, artifact, "2026-11-06T20:00:00.000Z", false, false).fresh).toBe(false);
    expect(mapArtifact251(sha, digest, null, "2026-11-04T20:00:00.000Z", false, false).artifact_matches).toBe(false);
  });
});
