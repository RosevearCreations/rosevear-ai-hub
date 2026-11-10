import { describe, expect, it } from "vitest";
import { prepareFieldPacket297, SOURCE_MAP_297 } from "./windowsFieldPacket297";

describe("Build 297 owner-supervised packet", () => {
  it("maps all seven suite members without alleging a connection", () => {
    expect(SOURCE_MAP_297).toHaveLength(7);
    expect(new Set(SOURCE_MAP_297.map(s => s.application)).size).toBe(7);
  });
  it("rejects absent or fabricated owner evidence", () => {
    const base = { note: null, checklist: null, expectedMainSha: "a".repeat(40), acknowledged: true, nowMs: Date.now() };
    expect(prepareFieldPacket297(base)).toBeNull();
    expect(prepareFieldPacket297({ ...base, acknowledged: false })).toBeNull();
    expect(prepareFieldPacket297({ ...base, expectedMainSha: "invalid" })).toBeNull();
    expect(prepareFieldPacket297({ ...base, note: { sourceSha: base.expectedMainSha } as never })).toBeNull();
  });
});

