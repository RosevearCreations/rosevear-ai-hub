import { describe, expect, it } from "vitest";
import { prioritizeDailyActions, summarizeOperations } from "./OperationsDashboard";

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

describe("Build 064 Home operator guidance", () => {
  it("points to VM and broker checks without exposing private connection values", () => {
    const result = summarizeOperations([
      ok({ configured: true, available: false, url_configured: true,
        token_configured: true, base_url: "http://hidden.local:8123" }),
      ok({ configured: true, available: false, username_configured: true,
        password_configured: true, last_error: "token=PRIVATE" }),
      ok({ total: 0, healthy: 0, attention: 0, transport_online: true }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]);
    expect(result[0].detail).toContain("HA VM");
    expect(result[1].detail).toContain("broker availability");
    expect(result[2].detail).toContain("not automatically imported");
    expect(JSON.stringify(result)).not.toContain("hidden.local");
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});

describe("Build 068 read-only HA/MQTT failure guidance", () => {
  it("distinguishes HA timeout and MQTT rejected credentials from private error messages", () => {
    const result = summarizeOperations([
      ok({
        configured: true, available: false, recovery_reason: "timeout",
        message: "token=SUPERSECRET", base_url: "http://internal:8123",
      }),
      ok({
        configured: true, available: false,
        recovery_reason: "broker_rejected_credentials",
        last_error: "username=private", host: "private-broker",
      }),
      bad,
      bad,
      bad,
    ]);
    expect(result[0].detail).toContain("timed out");
    expect(result[1].detail).toContain("rejected credentials");
    expect(JSON.stringify(result)).not.toMatch(/SUPERSECRET|private-broker|username=private|internal:8123/);
  });
});

describe("Build 083 context-aware daily action queue", () => {
  const results = [
    ok({ configured: true, available: false, recovery_reason: "timeout", url: "http://private.lan:8123" }),
    bad,
    ok({ total: 2, healthy: 2, attention: 0 }),
    ok({ document_count: 0, needs_indexing_count: 0 }),
    ok({ connectors: [{ status: { configured: true, available: false, token: "SECRET" } }] }),
  ];
  it("puts configured failures before unverified and treats optional setup as non-failure", () => {
    const signals = summarizeOperations(results);
    const home = prioritizeDailyActions(signals, "Home");
    expect(home.map((action) => [action.key, action.priority])).toEqual([
      ["ha", "review"], ["mqtt", "verify"],
    ]);
    expect(home[1].reason).toContain("Do not assume");
    const business = prioritizeDailyActions(signals, "Business");
    expect(business.map((action) => [action.key, action.priority])).toEqual([
      ["business", "review"], ["knowledge", "setup"], ["mqtt", "verify"],
    ].sort((a, b) => {
      const rank: Record<string, number> = { review: 0, verify: 1, setup: 2 };
      return rank[a[1]] - rank[b[1]];
    }));
    expect(JSON.stringify({ home, business })).not.toMatch(/private\.lan|SECRET|http:\/\//);
  });
  it("never schedules a follow-up for healthy known statuses", () => {
    const signals = summarizeOperations([
      ok({ configured: true, available: true }),
      ok({ configured: true, available: true }),
      ok({ total: 1, healthy: 1, attention: 0 }),
      ok({ document_count: 1, needs_indexing_count: 0 }),
      ok({ connectors: [{ status: { configured: true, available: true } }] }),
    ]);
    for (const context of ["Home", "Workshop", "Business"] as const) {
      expect(prioritizeDailyActions(signals, context)).toEqual([]);
    }
  });
  it("provides fixed navigation targets, ignores unknown signal keys and never echoes raw details", () => {
    const signals = summarizeOperations(results);
    const manipulated = [
      { ...signals[0], detail: "token=SECRET", section: "http://unsafe/" },
      { key: "unexpected", title: "injected", status: "attention" as const, detail: "SECRET", section: "Malicious" },
      ...signals.slice(1),
    ];
    const home = prioritizeDailyActions(manipulated, "Home");
    expect(home[0].section).toBe("Devices");
    expect(home.every((action) => action.key !== "unexpected")).toBe(true);
    expect(JSON.stringify(home)).not.toMatch(/SECRET|Malicious|unsafe/);
  });
});
