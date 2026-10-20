import { describe, expect, it } from "vitest";
import { compareOperationsSnapshots, countManualCheckProgress, countOutstandingSafeChecks, createOperationsHandoff, filterOutstandingSafeChecks, getSafeTriageChecks, prioritizeDailyActions, summarizeOperations } from "./OperationsDashboard";

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

describe("Build 085 bounded manual snapshot change detection", () => {
  it("puts new attention before lost verification before improvement, scoped by context", () => {
    const prior = summarizeOperations([
      ok({ configured: true, available: true }),
      ok({ configured: true, available: true }),
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]);
    const current = summarizeOperations([
      ok({ configured: true, available: false, last_error: "token=PRIVATE", url: "http://private.local" }),
      bad,
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]);
    const home = compareOperationsSnapshots(prior, current, "Home");
    expect(home.map((item) => [item.key, item.type, item.previous, item.current])).toEqual([
      ["ha", "needs_review", "ready", "attention"],
      ["mqtt", "verification_lost", "ready", "unknown"],
    ]);
    expect(compareOperationsSnapshots(prior, current, "Workshop").map((item) => item.key)).toEqual(["mqtt"]);
    expect(compareOperationsSnapshots(prior, current, "Business").map((item) => item.key)).toEqual(["mqtt"]);
    expect(JSON.stringify(home)).not.toMatch(/PRIVATE|private.local|http:\/\//);
  });
  it("does not claim physical recovery when a service reports ready", () => {
    const previous = summarizeOperations([
      ok({ configured: true, available: false }), bad, bad, bad, bad,
    ]);
    const current = summarizeOperations([
      ok({ configured: true, available: true }), bad, bad, bad, bad,
    ]);
    const home = compareOperationsSnapshots(previous, current, "Home");
    expect(home).toHaveLength(1);
    expect(home[0].type).toBe("improved");
    expect(home[0].guidance).toContain("not safety certification");
  });
  it("ignores unrecognized, duplicate, and unchanged reports rather than guessing", () => {
    const previous = summarizeOperations([
      ok({ configured: true, available: true }),
      ok({ configured: true, available: true }), bad, bad, bad,
    ]);
    const next = [
      { ...previous[0], status: "unknown" as const, detail: "SECRET" },
      { ...previous[0], status: "attention" as const },
      { key: "injected", title: "SECRET", section: "http://unsafe", status: "attention" as const, detail: "SECRET" },
      ...previous.slice(1),
    ];
    const changes = compareOperationsSnapshots(previous, next, "Home");
    expect(changes.map((item) => [item.key, item.type])).toEqual([["ha", "verification_lost"]]);
    expect(JSON.stringify(changes)).not.toMatch(/SECRET|unsafe|http:/);
    expect(compareOperationsSnapshots(previous, previous, "Home")).toEqual([]);
  });
});

describe("Build 086 privacy-safe manual handoff", () => {
  const previous = {
    sampledAt: new Date("2026-10-17T12:00:00.000Z"),
    signals: summarizeOperations([
      ok({ configured: true, available: true }),
      ok({ configured: true, available: true }),
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]),
  };
  const current = {
    sampledAt: new Date("2026-10-17T13:00:00.000Z"),
    signals: summarizeOperations([
      ok({ configured: true, available: false, token: "SECRET_HA_KEY", base_url: "http://lan-private:8123", last_error: "password=SECRET_HA" }),
      bad,
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]),
  };
  it("produces bounded static statuses, previous sample changes and acknowledgement caveats", () => {
    const home = createOperationsHandoff("Home", current, previous, { ha: true });
    expect(home).toContain("2026-10-17T13:00:00.000Z");
    expect(home).toContain("2026-10-17T12:00:00.000Z");
    expect(home).toContain("Reviewed for this snapshot, NOT resolved");
    expect(home).toContain("verification lost");
    expect(home).toContain("deferred; not proven");
    expect(home).not.toMatch(/SECRET|lan-private|password=|base_url|http:\/\//);
  });
  it("keeps each context scoped and works with no baseline", () => {
    const workshop = createOperationsHandoff("Workshop", current, null, {});
    expect(workshop).toContain("Compared with: unavailable");
    expect(workshop).toContain("No earlier snapshot available");
    expect(workshop).toContain("Review the camera registry");
    expect(workshop).not.toContain("Review Home Assistant connection");
    expect(workshop).not.toMatch(/SECRET|lan-private|http:/);
    const business = createOperationsHandoff("Business", current, previous, {});
    expect(business).toContain("Review business connectors");
    expect(business).not.toContain("Review Home Assistant connection");
    expect(business).not.toMatch(/SECRET|lan-private|http:/);
  });
  it("does not let hostile detail/title/section appear in output", () => {
    const altered = {
      ...current,
      signals: [
        { ...current.signals[0], title: "SECRET_USER", detail: "token=SECRET", section: "https://unsafe" },
        { key: "fake", title: "SECRET_FAKE", detail: "SECRET", section: "Private", status: "attention" as const },
        ...current.signals.slice(1),
      ],
    };
    const result = createOperationsHandoff("Home", altered, previous, {});
    expect(result).toContain("Review Home Assistant connection");
    expect(result).not.toMatch(/SECRET|unsafe|https?:\/\//);
  });
});

describe("Build 095 safe first-check playbooks", () => {
  it("provides separate finite manual guidance for attention, unknown and optional states", () => {
    const attention = getSafeTriageChecks("ha", "review");
    const unknown = getSafeTriageChecks("ha", "verify");
    const setup = getSafeTriageChecks("ha", "setup");
    expect(attention).toHaveLength(2);
    expect(attention[0]).toContain("Devices");
    expect(unknown[1]).toContain("unverified");
    expect(setup[1]).toContain("authorized operator");
    expect(attention).not.toEqual(unknown);
    expect(unknown).not.toEqual(setup);
  });

  it("covers each known integration without exposing injected fields or accepting unknown keys", () => {
    for (const key of ["ha", "mqtt", "camera", "knowledge", "business"]) {
      for (const priority of ["review", "verify", "setup"] as const) {
        const steps = getSafeTriageChecks(key, priority);
        expect(steps).toHaveLength(2);
        expect(steps.every((item) => item.length > 20)).toBe(true);
        expect(steps.join(" ")).not.toMatch(/PRIVATE|https?:\/\//);
      }
    }
    expect(getSafeTriageChecks("PRIVATE_TOKEN", "review")).toEqual([]);
    expect(getSafeTriageChecks("ha", "PRIVATE_TOKEN" as never)).toEqual([]);
    expect(getSafeTriageChecks("__proto__", "review")).toEqual([]);
  });
});

describe("Build 096 manual instruction progress", () => {
  it("only counts acknowledged finite safe-check steps for the active queue", () => {
    const actions = [
      { key: "ha", title: "Private title", section: "Unsafe", priority: "review" as const, reason: "PRIVATE" },
      { key: "mqtt", title: "Private title", section: "Unsafe", priority: "verify" as const, reason: "PRIVATE" },
    ];
    expect(countManualCheckProgress(actions, {})).toEqual({
      reviewedInstructions: 0, totalInstructions: 4,
    });
    expect(countManualCheckProgress(actions, { ha: 1, mqtt: 3 })).toEqual({
      reviewedInstructions: 3, totalInstructions: 4,
    });
    expect(countManualCheckProgress(actions.slice(0, 1), { ha: 3, mqtt: 3 })).toEqual({
      reviewedInstructions: 2, totalInstructions: 2,
    });
  });

  it("does not count unknown service keys or invalid review flags", () => {
    const actions = [
      { key: "invalid", title: "SECRET", section: "http://private", priority: "review" as const, reason: "PRIVATE" },
      { key: "camera", title: "Camera", section: "Cameras", priority: "setup" as const, reason: "Optional" },
    ];
    expect(countManualCheckProgress(actions, { camera: Number.NaN })).toEqual({
      reviewedInstructions: 0, totalInstructions: 2,
    });
    expect(countManualCheckProgress(actions, { camera: -1 })).toEqual({
      reviewedInstructions: 0, totalInstructions: 2,
    });
    expect(countManualCheckProgress([], { ha: 3, mqtt: 3 })).toEqual({
      reviewedInstructions: 0, totalInstructions: 0,
    });
  });
});

describe("Build 097 outstanding safe-check workbench", () => {
  const actions = [
    { key: "ha", title: "PRIVATE", section: "PRIVATE", priority: "review" as const, reason: "SECRET" },
    { key: "mqtt", title: "PRIVATE", section: "PRIVATE", priority: "verify" as const, reason: "SECRET" },
  ];
  it("reports reviewed and remaining steps per action, never verification success", () => {
    expect(countOutstandingSafeChecks(actions[0], {})).toEqual({ reviewed: 0, remaining: 2, total: 2 });
    expect(countOutstandingSafeChecks(actions[0], { ha: 1 })).toEqual({ reviewed: 1, remaining: 1, total: 2 });
    expect(countOutstandingSafeChecks(actions[0], { ha: 3 })).toEqual({ reviewed: 2, remaining: 0, total: 2 });
    expect(filterOutstandingSafeChecks(actions, { ha: 3 }).map(a => a.key)).toEqual(["mqtt"]);
    expect(filterOutstandingSafeChecks(actions, { ha: 3, mqtt: 3 })).toHaveLength(0);
    expect(filterOutstandingSafeChecks(actions, { ha: 1 })).toHaveLength(2);
  });
  it("fails closed for injected keys and invalid flags; never exposes untrusted titles", () => {
    const unknown = { key: "__proto__", title: "SECRET", section: "https://private", priority: "review" as const, reason: "PRIVATE" };
    expect(countOutstandingSafeChecks(unknown, {})).toEqual({ reviewed: 0, remaining: 0, total: 0 });
    expect(filterOutstandingSafeChecks([unknown, ...actions], { ha: NaN, mqtt: -1 }).map(a => a.key))
      .toEqual(["ha", "mqtt"]);
    expect(JSON.stringify(countOutstandingSafeChecks(actions[0], {}))).not.toMatch(/SECRET|PRIVATE/);
  });
});

describe("Build 098 sanitized instruction-review handoff", () => {
  const snapshot = {
    sampledAt: new Date("2026-10-19T19:00:00Z"),
    signals: summarizeOperations([
      ok({ configured: true, available: false, token: "PRIVATE_HA_TOKEN", base_url: "http://PRIVATE_URL" }),
      bad,
      ok({ total: 0, healthy: 0, attention: 0 }),
      ok({ document_count: 0, needs_indexing_count: 0 }),
      ok({ connectors: [] }),
    ]),
  };
  it("lists only current-context allowlisted reviewed and pending instructions", () => {
    const report = createOperationsHandoff("Home", snapshot, null, {}, { ha: 1, mqtt: 3, business: 3 });
    expect(report).toContain("Manual safe-check progress: 3/6 instructions reviewed");
    expect(report).toContain("Review Home Assistant connection: 1/2 instructions reviewed (NOT verified)");
    expect(report).toContain("Reviewed instruction 1: Open Devices");
    expect(report).toContain("Pending instruction 2:");
    expect(report).toContain("Check the MQTT broker: 2/2 instructions reviewed");
    expect(report).not.toContain("Review business connectors:");
    expect(report).not.toMatch(/PRIVATE_HA_TOKEN|PRIVATE_URL|private path/);
  });
  it("treats invalid bits as pending and no suggested actions as no verification", () => {
    const report = createOperationsHandoff("Workshop", snapshot, null, {}, { mqtt: NaN, camera: -1 });
    expect(report).toContain("Manual safe-check progress: 0/6 instructions reviewed");
    expect(report).not.toContain("Review Home Assistant connection");
    const ready = {
      sampledAt: snapshot.sampledAt,
      signals: snapshot.signals.map(signal => ({ ...signal, status: "ready" as const })),
    };
    const empty = createOperationsHandoff("Business", ready, null, {}, { business: 3 });
    expect(empty).toContain("Manual safe-check progress: 0/0 instructions reviewed");
    expect(empty).toContain("No suggested instruction reviews");
    expect(empty).not.toMatch(/PRIVATE_HA_TOKEN|PRIVATE_URL/);
  });
});
