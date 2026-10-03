import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
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
              available: true,
              base_url: "http://127.0.0.1:11434",
              version: "0.35.1",
              model_count: 0,
              message: "Ollama is available.",
            }),
          };
        }

        if (url.endsWith("/api/v1/models/ollama/models")) {
          return {
            ok: true,
            json: async () => ({
              base_url: "http://127.0.0.1:11434",
              models: [],
            }),
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders health and opens the streaming chat surface", async () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Backend online")).toBeInTheDocument();
      expect(screen.getByText("Ollama online")).toBeInTheDocument();
    });

    expect(screen.getByText(/Version 0.35.1/)).toBeInTheDocument();
    expect(screen.getByText(/0 local models/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Chat" }));

    await waitFor(() => {
      expect(
        screen.getByText("Ollama is ready, but no model is installed."),
      ).toBeInTheDocument();
    });
  });
});
