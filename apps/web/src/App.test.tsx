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

      if (url.endsWith("/api/v1/auth/status")) {
        return {
          ok: true,
          json: async () => ({
            bootstrap_required: false,
            authenticated: true,
            user: {
              id: 1,
              username: "owner",
              role: "owner",
              enabled: true,
              created_at: "2026-10-04T00:00:00Z",
            },
          }),
        };
      }

      if (url.endsWith("/api/v1/tools/summary")) {
        return {
          ok: true,
          json: async () => ({
            tool_count: 3,
            enabled_count: 2,
            disabled_count: 1,
            counts_by_risk: {
              read: 2,
              low_risk_action: 0,
              confirmation_required: 1,
              prohibited_autonomous: 0,
            },
            capabilities: [
              "ai.generate",
              "knowledge.answer",
              "knowledge.delete",
              "knowledge.read",
              "knowledge.search",
              "knowledge.write",
            ],
          }),
        };
      }

      if (url.endsWith("/api/v1/tools")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              tool_key: "knowledge.search",
              display_name: "Search local knowledge",
              description: "Search indexed local knowledge and return grounded evidence chunks.",
              integration_key: "core.knowledge",
              integration_name: "Knowledge",
              capabilities: ["knowledge.read", "knowledge.search"],
              risk_level: 0,
              risk_label: "read",
              confirmation_policy: "none",
              input_schema: {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"],
                additionalProperties: false,
              },
              output_schema: {
                type: "object",
                properties: { hits: { type: "array" } },
                required: ["hits"],
                additionalProperties: false,
              },
              enabled: true,
              built_in: true,
              created_at: "2026-10-05T00:00:00Z",
              updated_at: "2026-10-05T00:00:00Z",
            },
            {
              id: 2,
              tool_key: "knowledge.document.delete",
              display_name: "Delete knowledge document",
              description: "Delete a knowledge document after confirmation.",
              integration_key: "core.knowledge",
              integration_name: "Knowledge",
              capabilities: ["knowledge.delete", "knowledge.write"],
              risk_level: 2,
              risk_label: "confirmation_required",
              confirmation_policy: "required",
              input_schema: {
                type: "object",
                properties: { document_id: { type: "integer" } },
                required: ["document_id"],
                additionalProperties: false,
              },
              output_schema: {
                type: "object",
                properties: { deleted: { type: "boolean" } },
                required: ["deleted"],
                additionalProperties: false,
              },
              enabled: false,
              built_in: true,
              created_at: "2026-10-05T00:00:00Z",
              updated_at: "2026-10-05T00:00:00Z",
            },
          ],
        };
      }

      if (url.endsWith("/api/v1/auth/users")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              username: "owner",
              role: "owner",
              enabled: true,
              created_at: "2026-10-04T00:00:00Z",
            },
          ],
        };
      }

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

      if (url.endsWith("/api/v1/knowledge/collections")) {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              name: "Inbox",
              description: "Default local knowledge intake collection.",
              local_only: true,
              created_at: "2026-10-03T00:00:00Z",
            },
          ],
        };
      }

      if (url.endsWith("/api/v1/knowledge/documents")) {
        return {
          ok: true,
          json: async () => [],
        };
      }

      if (url.endsWith("/api/v1/knowledge/admin/status")) {
        return {
          ok: true,
          json: async () => ({
            collection_count: 1,
            local_only_collection_count: 1,
            document_count: 0,
            indexed_document_count: 0,
            needs_indexing_count: 0,
            chunk_count: 0,
            embedding_count: 0,
            total_source_bytes: 0,
            documents_by_status: {},
          }),
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

    await waitFor(() => {
      expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
      expect(screen.getByText("owner")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tools" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
    });

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

  test("opens the normalized tool registry", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Tools" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Tools" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Tool registry" })).toBeInTheDocument();
      expect(screen.getByText("Search local knowledge")).toBeInTheDocument();
      expect(screen.getByText("Level 0 — Read")).toBeInTheDocument();
      expect(screen.getByText("Level 2 — Confirmation required")).toBeInTheDocument();
      expect(screen.getByText("knowledge.read")).toBeInTheDocument();
      expect(screen.getByText("knowledge.delete")).toBeInTheDocument();
    });
  });

  test("opens the local knowledge ingestion surface", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Knowledge" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Knowledge" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Search local knowledge" })).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Knowledge administration" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Create collection" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Ingest a file" })).toBeInTheDocument();
      expect(screen.getByText(/PDF, TXT, Markdown, and DOCX/)).toBeInTheDocument();
      expect(screen.getByText("No documents yet")).toBeInTheDocument();
    });
  });

  test("keeps chat history surface available while the provider is offline", async () => {
    vi.unstubAllGlobals();
    installFetchMock({ providerAvailable: false, modelFailure: true });

    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    });
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
