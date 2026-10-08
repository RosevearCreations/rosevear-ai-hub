import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AutomationView } from "./AutomationView";

function response(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

describe("AutomationView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/v1/automations") && method === "GET") {
          return response([]);
        }
        if (url.endsWith("/api/v1/models/ollama/models")) {
          return response({
            base_url: "http://127.0.0.1:11434",
            models: [
              {
                name: "qwen-test:latest",
                model: "qwen-test:latest",
                modified_at: null,
                size: 1,
                digest: "abc",
                details: {
                  format: "gguf",
                  family: "qwen",
                  families: ["qwen"],
                  parameter_size: "1B",
                  quantization_level: "Q4",
                },
              },
            ],
          });
        }
        if (url.endsWith("/api/v1/automations/runtime")) {
          return response({
            running: true,
            queue_depth: 0,
            queue_capacity: 256,
            processed_events: 12,
            dropped_events: 0,
            failed_events: 0,
            home_assistant_configured: true,
            mqtt_configured: true,
            mqtt_rule_subscriptions: [],
            last_error: null,
            recovered_interrupted_runs: 1,
          });
        }
        if (url.endsWith("/api/v1/automations/history/summary")) {
          return response({
            total_runs: 7,
            success_count: 4,
            failed_count: 1,
            interrupted_count: 1,
            skipped_count: 1,
            running_count: 0,
            failure_count: 2,
            automations_with_failures: 1,
            newest_run_at: "2026-10-08T20:00:00Z",
            latest_failure_at: "2026-10-08T19:55:00Z",
            automatic_retry_enabled: false,
          });
        }
        if (url.includes("/api/v1/automations/history?")) {
          return response({
            runs: [
              {
                id: 7,
                automation_id: 42,
                automation_name: "Garage scene monitor",
                started_at: "2026-10-08T19:55:00Z",
                completed_at: "2026-10-08T19:55:01Z",
                status: "failed",
                result_summary: {
                  event: { source: "home_assistant" },
                  actions_completed: 0,
                  failure_kind: "execution_error",
                  error: "Entity state is unavailable.",
                  automatic_retry: false,
                },
                duration_ms: 1000,
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          });
        }
        if (url.endsWith("/api/v1/automations/author/draft") && method === "POST") {
          return response({
            valid: true,
            name: "Workshop motion light",
            definition: {
              schema_version: 1,
              trigger: {
                type: "state_change",
                entity_id: "binary_sensor.workshop_motion",
                to_state: "on",
              },
              conditions: [],
              actions: [
                {
                  type: "tool",
                  tool_key: "home_assistant.light.set",
                  arguments: { entity_id: "light.workshop", state: "on" },
                },
              ],
              cooldown_seconds: 30,
              deduplication_key: "workshop.motion.light",
            },
            explanation: "Turn on the workshop light when motion starts.",
            assumptions: ["Workshop light is safe to automate."],
            warnings: [],
            referenced_tools: ["home_assistant.light.set"],
            provider: "ollama",
            model: "qwen-test:latest",
            recommended_enabled: false,
          });
        }
        if (url.endsWith("/api/v1/automations/confirm") && method === "POST") {
          return response({
            confirmation_id: "confirmation-028",
            status: "pending",
            arguments_hash: "a".repeat(64),
            preview: {
              tool_key: "automation.rule.change",
              tool_name: "Change automation rule",
              description: "Create, update, or delete one automation.",
              risk_level: 2,
              risk_label: "confirmation_required",
              summary: "Change automation rule: Workshop motion light",
              arguments: { operation: "create", name: "Workshop motion light" },
            },
            expires_at: "2026-10-08T18:00:00Z",
          });
        }
        if (
          url.endsWith("/api/v1/confirmations/confirmation-028/approve")
          && method === "POST"
        ) {
          return response({
            id: "confirmation-028",
            status: "approved",
          });
        }
        if (
          url.includes("/api/v1/automations/apply?confirmation_id=confirmation-028")
          && method === "POST"
        ) {
          return response({
            operation: "create",
            deleted: false,
            automation: {
              id: 1,
              name: "Workshop motion light",
              enabled: false,
              definition: {
                schema_version: 1,
                trigger: {
                  type: "state_change",
                  entity_id: "binary_sensor.workshop_motion",
                  to_state: "on",
                },
                conditions: [],
                actions: [],
                cooldown_seconds: 30,
                deduplication_key: "workshop.motion.light",
              },
              created_by: 1,
              created_at: "2026-10-08T17:00:00Z",
              updated_at: "2026-10-08T17:00:00Z",
            },
          });
        }

        return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("drafts, reviews, confirms, and creates a disabled automation", async () => {
    render(<AutomationView />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Automations" })).toBeInTheDocument();
      expect(screen.getByText("Event Engine running")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Execution history" })).toBeInTheDocument();
      expect(screen.getByText("Garage scene monitor")).toBeInTheDocument();
      expect(screen.getByText("Entity state is unavailable.")).toBeInTheDocument();
      expect(
        screen.getByText(/Failed and interrupted actions are never retried automatically/),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Describe the automation"), {
      target: { value: "Turn on workshop light when motion starts." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draft and validate" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Workshop motion light" })).toBeInTheDocument();
      expect(screen.getByText("Validated draft")).toBeInTheDocument();
      expect(screen.getByText("Workshop light is safe to automate.")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Prepare exact save confirmation" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Exact Level-2 action")).toBeInTheDocument();
      expect(screen.getByText("Change automation rule: Workshop motion light")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Approve and create this exact rule" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Automation created disabled. Enable it only after final review."),
      ).toBeInTheDocument();
      expect(screen.getByText("Workshop motion light")).toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });
  });
});
