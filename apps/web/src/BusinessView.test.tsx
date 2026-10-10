import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { BusinessView } from "./BusinessView";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function connectorPayload(configured = false) {
  return {
    framework_version: "1",
    read_only_default: true,
    write_confirmation_required: true,
    connectors: [
      {
        key: "devilndove",
        display_name: "Devil n Dove",
        description: "Read-only live shop data.",
        planned_build: 37,
        access_mode: "read_only",
        writes_require_confirmation: true,
        capabilities: [
          {
            key: "catalogue.read",
            label: "Catalogue",
            description: "Read products.",
            access: "read_only",
          },
          {
            key: "orders.read",
            label: "Orders",
            description: "Read orders.",
            access: "read_only",
          },
          {
            key: "inventory.read",
            label: "Inventory",
            description: "Read inventory.",
            access: "read_only",
          },
        ],
        status: {
          state: configured
            ? "configured"
            : "unconfigured",
          configured,
          available: false,
          message: configured
            ? "Devil n Dove read access is configured."
            : "Devil n Dove read access is ready but no credential is configured.",
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
          message:
            "Rosie Dazzlers read connector is reserved for Build 038.",
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
          message:
            "Yard Workers read connector is reserved for Build 039.",
          retryable: false,
        },
      },
    ],
  };
}

describe("BusinessView", () => {
  test(
    "shows Build 037 with Devil n Dove awaiting credentials",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({
          ok: true,
          json: async () => connectorPayload(false),
        })),
      );

      render(<BusinessView />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: "Business connectors",
          }),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Devil n Dove"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Rosie Dazzlers"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Yard Workers"),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Read-only by default: Yes/),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/writes stay blocked/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", {
            name: "Read Catalogue",
          }),
        ).toBeDisabled();
        expect(
          screen.getByText(
            /Configure the Devil n Dove admin credential in Secrets/i,
          ),
        ).toBeInTheDocument();
      });
    },
  );

  test(
    "loads a bounded Devil n Dove catalogue preview",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/read/catalogue")) {
            return {
              ok: true,
              json: async () => ({
                connector_key: "devilndove",
                resource: "catalogue",
                records: [
                  {
                    product_id: 42,
                    name: "Copper Dove",
                    sku: "DD-42",
                  },
                ],
                next_cursor: "41",
              }),
            };
          }
          return {
            ok: true,
            json: async () => connectorPayload(true),
          };
        }),
      );

      render(<BusinessView />);

      const button = await screen.findByRole(
        "button",
        { name: "Read Catalogue" },
      );
      expect(button).toBeEnabled();
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /Devil n Dove Catalogue — 1 record/,
          }),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Copper Dove/),
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            /More catalogue records are available/,
          ),
        ).toBeInTheDocument();
      });
    },
  );
});
