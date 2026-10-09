import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { BusinessView } from "./BusinessView";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("BusinessView", () => {
  test("shows the read-first framework and planned business connectors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          framework_version: "1",
          read_only_default: true,
          write_confirmation_required: true,
          connectors: [
            {
              key: "devilndove",
              display_name: "Devil n Dove",
              description: "Read-first shop data.",
              planned_build: 37,
              access_mode: "read_only",
              writes_require_confirmation: true,
              capabilities: [
                {
                  key: "catalogue.read",
                  label: "Catalogue",
                  description: "Read products and listing metadata.",
                  access: "read_only",
                },
              ],
              status: {
                state: "planned",
                configured: false,
                available: false,
                message: "Devil n Dove read connector is reserved for Build 037.",
                retryable: false,
              },
            },
            {
              key: "rosiedazzlers",
              display_name: "Rosie Dazzlers",
              description: "Read-first detailing data.",
              planned_build: 38,
              access_mode: "read_only",
              writes_require_confirmation: true,
              capabilities: [],
              status: {
                state: "planned",
                configured: false,
                available: false,
                message: "Rosie Dazzlers read connector is reserved for Build 038.",
                retryable: false,
              },
            },
            {
              key: "yardworkers",
              display_name: "Yard Workers",
              description: "Read-first landscaping data.",
              planned_build: 39,
              access_mode: "read_only",
              writes_require_confirmation: true,
              capabilities: [],
              status: {
                state: "planned",
                configured: false,
                available: false,
                message: "Yard Workers read connector is reserved for Build 039.",
                retryable: false,
              },
            },
          ],
        }),
      })),
    );

    render(<BusinessView />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Business connectors" })).toBeInTheDocument();
      expect(screen.getByText("Devil n Dove")).toBeInTheDocument();
      expect(screen.getByText("Rosie Dazzlers")).toBeInTheDocument();
      expect(screen.getByText("Yard Workers")).toBeInTheDocument();
      expect(screen.getByText(/Read-only by default: Yes/)).toBeInTheDocument();
      expect(screen.getByText(/writes remain blocked/i)).toBeInTheDocument();
    });
  });
});
