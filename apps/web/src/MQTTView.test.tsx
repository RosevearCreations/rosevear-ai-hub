import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MQTTView } from "./MQTTView";

const owner = {
  id: 1,
  username: "owner",
  role: "owner" as const,
  enabled: true,
  created_at: "2026-10-08T02:00:00Z",
};

describe("MQTTView", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.includes("/api/v1/mqtt/status")) {
          return { ok: true, json: async () => ({
            configured: true, available: true, host: "mqtt.test", port: 1883, tls: false,
            username_configured: true, password_configured: true,
            allowed_topics: ["rosevear/#"], subscriptions: [],
            reconnect_min_seconds: 1, reconnect_max_seconds: 30,
            message_count: 1, last_error: null, message: "MQTT broker connected.",
          }) };
        }
        if (url.includes("/api/v1/mqtt/messages")) {
          return { ok: true, json: async () => [{
            topic: "rosevear/sensors/temp", payload: "21.5", qos: 0, retain: false,
            received_at: "2026-10-08T02:00:00Z",
          }] };
        }
        if (url.endsWith("/api/v1/mqtt/subscriptions") && method === "POST") {
          return { ok: true, json: async () => ({
            subscribed: true, topic_filter: "rosevear/sensors/#", qos: 0,
          }) };
        }
        if (url.endsWith("/api/v1/mqtt/publish") && method === "POST") {
          const body = JSON.parse(String(init?.body)) as { retain: boolean };
          expect(body.retain).toBe(false);
          return { ok: true, json: async () => ({
            accepted: true, topic: "rosevear/test", qos: 0, retain: false, message_id: 7,
          }) };
        }
        return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("shows state and performs bounded MQTT actions", async () => {
    render(<MQTTView currentUser={owner} />);
    await waitFor(() => expect(screen.getByText("MQTT broker online")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("MQTT subscription topic"), {
      target: { value: "rosevear/sensors/#" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    await waitFor(() => expect(screen.getByText("Subscribed to rosevear/sensors/#.")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("MQTT publish topic"), {
      target: { value: "rosevear/test" },
    });
    fireEvent.change(screen.getByLabelText("MQTT publish payload"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText("Published message 7 to rosevear/test.")).toBeInTheDocument());
  });

  test("read-only users see no MQTT write controls", async () => {
    render(<MQTTView currentUser={{ ...owner, role: "read_only" }} />);
    await waitFor(() => expect(screen.getByText("MQTT broker online")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });
});
