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
        if (url.includes("/api/v1/mqtt/topics/explorer")) {
          return { ok: true, json: async () => ({
            observed_at: "2026-10-25T12:00:00Z", connected: true,
            source: "bounded_received_buffer", note: "buffered only",
            topics: [{ topic: "rosevear/sensors/temp", state_preview: "21.5",
              state_kind: "numeric", message_count: 2, last_seen_at: "2026-10-25T12:00:00Z",
              qos: 0, retained: false }],
          }) };
        }
        if (url.includes("/api/v1/device-registry/reviews")) {
          return { ok: true, json: async () => ({ annotations: [], matches: [] }) };
        }
        if (url.includes("/api/v1/home-assistant/browser")) {
          return { ok: true, json: async () => ({ devices: [{ device_id: "device-1", name: "Workshop sensor" }] }) };
        }
        if (url.endsWith("/api/v1/device-registry/match-review") && method === "PUT") {
          const body = JSON.parse(String(init?.body));
          expect(body).toMatchObject({
            left: { source: "mqtt", source_id: "rosevear/sensors/temp" },
            right: { source: "ha_device", source_id: "device-1" },
            decision: "possible_match", expected_revision: 0,
          });
          return { ok: true, json: async () => ({ ...body, revision: 1 }) };
        }
        if (url.endsWith("/api/v1/mqtt/publish-preview") && method === "POST") {
          const body = JSON.parse(String(init?.body));
          return { ok: true, json: async () => ({
            topic: body.topic, qos: 0, retain: false, connected: true, allowed: true,
            payload_bytes: 5, payload_sha256: "a".repeat(64), reason: "Allowed; explicit confirm required.",
          }) };
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

  test("shows bounded observations and requires preview plus exact publish confirmation", async () => {
    render(<MQTTView currentUser={owner} />);
    await waitFor(() => expect(screen.getByText("MQTT broker online")).toBeInTheDocument());
    expect(await screen.findByText("21.5")).toBeInTheDocument();
    expect(screen.queryByText("secret-token-should-never-render")).not.toBeInTheDocument();
    expect(screen.getByLabelText("MQTT subscription topic").closest("article"))
      .toHaveClass("mqtt-action-card");
    expect(screen.getByLabelText("MQTT publish payload").closest("article"))
      .toHaveClass("mqtt-action-card");

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
    const fetcher = vi.mocked(fetch);
    const countPublishes = () => fetcher.mock.calls.filter(([url, init]) =>
      String(url).endsWith("/api/v1/mqtt/publish") && (init as RequestInit)?.method === "POST").length;
    expect(countPublishes()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Preview — do not publish" }));
    expect(await screen.findByText(/Payload SHA-256:/)).toBeInTheDocument();
    expect(countPublishes()).toBe(0);
    expect(screen.getByRole("button", { name: "Confirm and publish once" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm exact publish topic"), { target: { value: "rosevear/test" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and publish once" }));
    await waitFor(() => expect(screen.getByText("Published message 7 to rosevear/test.")).toBeInTheDocument());
    expect(countPublishes()).toBe(1);

    fireEvent.change(screen.getByLabelText("Mapping MQTT topic"), {
      target: { value: "rosevear/sensors/temp" },
    });
    fireEvent.change(screen.getByLabelText("Mapping HA device ID"), { target: { value: "device-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview possible match" }));
    expect(screen.getByText(/Manual association review/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save reviewed possible match" }));
    await waitFor(() => expect(screen.getByText(/Possible topic-to-device association saved/)).toBeInTheDocument());
  });

  test("read-only users see no MQTT write controls", async () => {
    render(<MQTTView currentUser={{ ...owner, role: "read_only" }} />);
    await waitFor(() => expect(screen.getByText("MQTT broker online")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview — do not publish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview possible match" })).not.toBeInTheDocument();
  });
  test("changing exact topic or payload revokes a previously approved preview", async () => {
    render(<MQTTView currentUser={owner} />);
    await screen.findByText("MQTT broker online");
    fireEvent.change(screen.getByLabelText("MQTT publish topic"), { target: { value: "rosevear/sensors/temp" } });
    fireEvent.change(screen.getByLabelText("MQTT publish payload"), { target: { value: "on" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview — do not publish" }));
    expect(await screen.findByRole("button", { name: "Confirm and publish once" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Confirm exact publish topic"), { target: { value: "rosevear/sensors/temp" } });
    expect(screen.getByRole("button", { name: "Confirm and publish once" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("MQTT publish payload"), { target: { value: "off" } });
    expect(screen.queryByRole("button", { name: "Confirm and publish once" })).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/api/v1/mqtt/publish"))).toBe(false);
  });
  test("reconnecting broker shows recovery guidance and disables actions", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/mqtt/status")) {
        return { ok: true, json: async () => ({
          configured: true, available: false, host: "192.0.2.10", port: 1883, tls: false,
          username_configured: true, password_configured: true,
          allowed_topics: ["rosevear/#"], subscriptions: [],
          reconnect_min_seconds: 1, reconnect_max_seconds: 30,
          message_count: 0, last_error: null,
          message: "MQTT connection is starting or reconnecting.",
        }) };
      }
      return { ok: true, json: async () => [] };
    }));
    render(<MQTTView currentUser={owner} />);
    expect(await screen.findByText("MQTT reconnecting")).toBeInTheDocument();
    expect(screen.getByText("Broker connection needs attention")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("MQTT publish topic"), {
      target: { value: "rosevear/test" },
    });
    expect(screen.getByRole("button", { name: "Preview — do not publish" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeDisabled();
  });
});
