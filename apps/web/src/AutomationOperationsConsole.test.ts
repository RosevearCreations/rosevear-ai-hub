import { describe, expect, test } from "vitest";
import { describeTrigger, lastRunForRule, readiness } from "./AutomationOperationsConsole";
import type { AutomationRule, AutomationRun, AutomationRuntime } from "./api";

const rule = (enabled: boolean, type: string): AutomationRule => ({
  id: 5, name: "Workshop notice", enabled,
  definition: { trigger: { type }, cooldown_seconds: 60 }, created_by: 1,
  created_at: "2026-10-12T12:00:00Z", updated_at: "2026-10-12T12:00:00Z",
});
const runtime: AutomationRuntime = {
  running: true, queue_depth: 0, queue_capacity: 256,
  processed_events: 2, dropped_events: 0, failed_events: 0,
  home_assistant_configured: true, mqtt_configured: false,
  mqtt_rule_subscriptions: [], frigate_configured: true, frigate_online: false,
  frigate_rule_count: 0, frigate_seen_event_count: 0,
  frigate_last_poll_at: null, last_error: null,
};
const run = (id: number, started_at: string): AutomationRun => ({
  id, automation_id: 5, automation_name: "Workshop notice", started_at, completed_at: null,
  status: "interrupted", result_summary: { automatic_retry: false }, duration_ms: null,
});
describe("Build 056 operations console", () => {
  test("does not pretend unscheduled event rules are clock schedules", () => {
    expect(describeTrigger(rule(true, "mqtt_message"))).toContain("MQTT");
    expect(describeTrigger(rule(true, "frigate_event"))).toContain("camera event");
    expect(describeTrigger(rule(true, "unknown"))).toBe("Unsupported event trigger");
  });
  test("distinguishes disabled, no runtime and source configuration", () => {
    expect(readiness(rule(false, "mqtt_message"), runtime)).toBe("disabled");
    expect(readiness(rule(true, "mqtt_message"), runtime)).toBe("check_source");
    expect(readiness(rule(true, "frigate_event"), runtime)).toBe("check_source");
    expect(readiness(rule(true, "state_change"), runtime)).toBe("event_ready");
    expect(readiness(rule(true, "state_change"), null)).toBe("check_runtime");
  });
  test("most recent run ordering is independent of server list order", () => {
    const events = [run(3, "2026-10-10T12:00:00Z"), run(4, "2026-10-12T12:00:00Z")];
    expect(lastRunForRule(5, events)?.id).toBe(4);
    expect(lastRunForRule(6, events)).toBeUndefined();
  });
});
