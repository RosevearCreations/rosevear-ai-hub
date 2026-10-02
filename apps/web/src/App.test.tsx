import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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
              version: "0.12.0",
              model_count: 2,
              message: "Ollama is available.",
            }),
          };
        }

        return { ok: false, status: 404 };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders navigation, backend health, and Ollama discovery", async () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Backend online")).toBeInTheDocument();
      expect(screen.getByText("Ollama online")).toBeInTheDocument();
    });

    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText(/Version 0.12.0/)).toBeInTheDocument();
    expect(screen.getByText(/2 local models/)).toBeInTheDocument();
  });
});
