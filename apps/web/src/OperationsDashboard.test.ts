import { describe, expect, it } from "vitest";
import { summarizeOperations } from "./OperationsDashboard";

const ok = (value: unknown): PromiseFulfilledResult<unknown> => ({
  status: "fulfilled",
  value,
});
const bad: PromiseRejectedResult = { status: "rejected", reason: new Error("private path") };

describe("Build 052 operations summary", () => {
  it("shows optional services without pretending they are broken", () => {
    const results = summarizeOperations([
      ok({ configured: false, available: false }),
      ok({ configured: false, available: false }),
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]);
    expect(results).toHaveLength(5);
    expect(results.every((item) => item.status === "optional")).toBe(true);
  });
  it("flags real trouble but hides raw provider errors and secrets", () => {
    const results = summarizeOperations([
      ok({ configured: true, available: false, base_url: "http://private-server/" }),
      bad,
      ok({ total: 2, healthy: 1, attention: 1 }),
      ok({ document_count: 3, needs_indexing_count: 2 }),
      ok({ connectors: [{ status: { configured: true, available: false } }] }),
    ]);
    expect(results.map((item) => item.status)).toEqual([
      "attention", "unknown", "attention", "attention", "attention",
    ]);
    expect(JSON.stringify(results)).not.toContain("private");
    expect(JSON.stringify(results)).not.toContain("http://");
  });
});
