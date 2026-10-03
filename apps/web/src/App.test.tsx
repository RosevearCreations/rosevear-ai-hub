import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { App } from "./App";

function providerPayload(available = true) {
  return [
    {
      key: "ollama",
      display_name: "Ollama",
      provider_type: "local",
      privacy_policy: "local_only",
      supports_streaming: true,
      supports_tools: false,
      enabled: true,
      available,
      degraded: !available,
      message: available ? "Ollama is available." : "Unable to reach Ollama.",
      version: available ? "0.35.1" : null,
      model_count: available ? 0 : null,
      consecutive_failures: available ? 0 : 1,
      retry_after_seconds: available ? 0 : 5,
      last_error: available ? null : "Unable to reach Ollama.",
    },
  ];
}

function installFetchMock(options?: { providerAvailable?: boolean; modelFailure?: boolean }) {
  const providerAvailable = options?.providerAvailable ?? true;
  const modelFailure = options?.modelFailure ?? false;

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/health")) {
        return {
          ok: true,
          json: async () => ({
            status: "ok",
            service: "Rosevear AI Hub",
            environment: "test",
          }),
        };
      }

      if (url.endsWith("/api/v1/models/ollama/status")) {
        return {
          ok: true,
          json: async () => ({
            available: providerAvailable,
            base_url: "http://127.0.0.1:11434",
            version: providerAvailable ? "0.35.1" : null,
            model_count: 0,
            message: providerAvailable ? "Ollama is available." : "Ollama offline.",
          }),
        };
      }

      if (url.endsWith("/api/v1/models/ollama/models")) {
        if (modelFailure) {
          return { ok: false, status: 503 };
        }
        return {
          ok: true,
          json: async () => ({
            base_url: "http://127.0.0.1:11434",
            models: [],
          }),
        };
      }

      if (url.endsWith("/api/v1/models/providers")) {
        return {
          ok: true,
          json: async () => providerPayload(providerAvailable),
        };
      }

      if (url.endsWith("/api/v1/models/profiles")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              slug: "general",
              name: "General",
              system_prompt: "General prompt",
              preferred_provider: "ollama",
              preferred_model: null,
              privacy_policy: "local_only",
              enabled: true,
              built_in: true,
            },
          ],
        };
      }

      if (url.endsWith("/api/v1/chat/conversations")) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      return { ok: false, status: 404 };
    }),
  );
}

describe("App", () => {
  beforeEach(() => {
    installFetchMock();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("renders health and opens the reliable chat surface", async () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Backend online")).toBeInTheDocument();
      expect(screen.getByText("Ollama online")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));

    await waitFor(() => {
      expect(
        screen.getByText("Ollama is ready, but no model is installed."),
      ).toBeInTheDocument();
      expect(screen.getByText(/General · local_only · Ollama online/)).toBeInTheDocument();
    });
  });

  test("keeps chat history surface available while the provider is offline", async () => {
    vi.unstubAllGlobals();
    installFetchMock({ providerAvailable: false, modelFailure: true });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));

    await waitFor(() => {
      expect(screen.getByText("Ollama is offline.")).toBeInTheDocument();
      expect(
        screen.getByText(/Conversation history remains available/),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    });
  });
});
