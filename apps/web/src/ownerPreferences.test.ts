import { describe, expect, it } from "vitest";

import { EMPTY_OWNER_VIEWS, ownerPreferenceKey, parseOwnerPreferences, saveOwnerView } from "./ownerPreferences";

describe("Build 223 owner display schema and recovery", () => {
  const base = () => saveOwnerView(EMPTY_OWNER_VIEWS(7), {
    name: "Morning", density: "compact", theme: "standard", startSection: "System",
  });

  it("round-trips a strict display-only schema and isolates owners", () => {
    const doc = base();
    expect(parseOwnerPreferences(JSON.stringify(doc), 7)).toEqual(doc);
    expect(ownerPreferenceKey(7)).not.toBe(ownerPreferenceKey(8));
    expect(() => parseOwnerPreferences(JSON.stringify(doc), 8)).toThrow(/another owner/);
  });

  it("rejects stale versions, unexpected credential keys, invalid values and duplicates", () => {
    const doc = base();
    expect(() => parseOwnerPreferences("not json", 7)).toThrow(/JSON/);
    expect(() => parseOwnerPreferences(JSON.stringify({ ...doc, schemaVersion: 2 }), 7)).toThrow(/schema/);
    expect(() => parseOwnerPreferences(JSON.stringify({ ...doc, token: "private" }), 7)).toThrow(/unexpected/);
    expect(() => parseOwnerPreferences(JSON.stringify({ ...doc, views: [{ ...doc.views[0], secret: "x" }] }), 7)).toThrow(/unsupported/);
    expect(() => parseOwnerPreferences(JSON.stringify({ ...doc, views: [{ ...doc.views[0], theme: "green" }] }), 7)).toThrow(/unsupported/);
    expect(() => parseOwnerPreferences(JSON.stringify({ ...doc, views: [doc.views[0], { ...doc.views[0], name: "morning" }] }), 7)).toThrow(/Duplicate/);
    expect(() => parseOwnerPreferences("x".repeat(16_385), 7)).toThrow(/16 KB/);
  });

  it("replaces only same-named display views and restores an empty schema", () => {
    const doc = saveOwnerView(base(), { name: "morning", density: "comfortable", theme: "high-contrast", startSection: "Home" });
    expect(doc.views).toHaveLength(1);
    expect(doc.views[0].theme).toBe("high-contrast");
    expect(EMPTY_OWNER_VIEWS(7).views).toEqual([]);
  });
});
