import { describe, expect, it } from "vitest";
import { assessInstalledHub, createInstalledHubReceipt, parsePrivateFieldHandoff } from "./installedHubAdoption";

const main = "a".repeat(40);
const other = "b".repeat(40);
const run = "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/39892570091";
const source = {
  expectedMainSha: main,
  mainRunUrl: run,
  web: { sha: main, clean: true },
  api: { service: "Hub", version: "0.1.0", environment: "production" },
  local: { active_release: main, adoption_state: "ADOPTED" } as never,
  field: { generated_at: "2026-10-23T12:00:00Z", source_worklist_at: "2026-10-21T11:00:00Z", source_ledger_generated_at: "2026-10-22T12:00:00Z", unresolved_ha: 2, unresolved_camera: 1 },
  ownerOpenedWindowsHub: true,
  ownerReloadedBrowser: true,
};

describe("Build 113 installed Windows Hub evidence", () => {
  it("does not equate matching stamps and operator marks to machine acceptance", () => {
    const result = assessInstalledHub(source);
    expect(result.source_reference).toBe("owner_entered_not_independently_verified");
    expect(result.web_status).toBe("matches_reported_main");
    expect(result.recorded_release_status).toBe("matches_reported_main");
    expect(result.overall).toBe("FIELD_ADOPTION_HOLD");
    expect(result.holds.some((hold) => hold.includes("not independently verified"))).toBe(true);
    const receipt = createInstalledHubReceipt(source, "2026-10-23T13:00:00Z");
    expect(receipt.machine_acceptance).toBe(false);
    expect(receipt.physical_camera_acceptance).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain("password");
  });

  it("holds stale or dirty browser assets, unavailable local records and invalid owner main references", () => {
    const result = assessInstalledHub({ ...source, web: { sha: other, clean: true }, local: { active_release: other } as never });
    expect(result.web_status).toBe("stale_or_other_build");
    expect(result.recorded_release_status).toBe("different_release_recorded");
    expect(result.holds.join(" ")).toContain("Browser assets do not match");
    expect(assessInstalledHub({ ...source, web: { sha: main, clean: false } }).web_status).toBe("unverified_local_changes");
    const missing = assessInstalledHub({ ...source, mainRunUrl: "https://evil.example/runs/123", local: null, api: null, field: null });
    expect(missing.source_reference).toBe("missing_or_invalid");
    expect(missing.web_status).toBe("no_main_reference");
    expect(missing.recorded_release_status).toBe("not_recorded");
    expect(missing.holds.some((hold) => hold.includes("backend"))).toBe(true);
    expect(createInstalledHubReceipt({ ...source, mainRunUrl: "invalid" }).expected_main).toBeNull();
  });

  it("accepts only a bounded Build 112 lineage and drops private device identities", () => {
    const raw = JSON.stringify({
      schema: "rosevear-device-camera-field-recheck-drift-handoff/v1",
      generated_at: "2026-10-23T12:00:00Z", source_worklist_at: "2026-10-21T11:00:00Z",
      source_ledger_generated_at: "2026-10-22T12:00:00Z",
      summary: { unresolved_ha: 3, unresolved_camera: 2 },
      unresolved: [{ id: "private-camera", name: "Bedroom", rtsp_password: "SECRET" }],
    });
    const evidence = parsePrivateFieldHandoff(raw);
    expect(evidence.unresolved_camera).toBe(2);
    expect(JSON.stringify(evidence)).not.toMatch(/Bedroom|private-camera|SECRET/);
    expect(() => parsePrivateFieldHandoff('{"schema":"other"}')).toThrow(/Build 112/);
    expect(() => parsePrivateFieldHandoff(raw.replace("2026-10-23T12:00:00Z", "2026-10-20T12:00:00Z"))).toThrow(/predates/);
    expect(() => parsePrivateFieldHandoff(raw.replace('"unresolved_ha":3', '"unresolved_ha":-3'))).toThrow(/incomplete/);
  });
});
