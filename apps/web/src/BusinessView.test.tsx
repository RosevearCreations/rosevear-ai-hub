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
        capabilities: [
          {
            key: "bookings.read",
            label: "Bookings",
            description: "Read bookings.",
            access: "read_only",
          },
          {
            key: "customers.read",
            label: "Customers",
            description: "Read customers.",
            access: "read_only",
          },
          {
            key: "jobs.read",
            label: "Jobs",
            description: "Read jobs.",
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
          state: "unconfigured",
          configured: false,
          available: false,
          message:
            "Rosie Dazzlers read access is ready but no staff session token is configured.",
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
        capabilities: [
          {
            key: "clients.read",
            label: "Clients",
            description: "Read clients.",
            access: "read_only",
          },
          {
            key: "jobs.read",
            label: "Jobs",
            description: "Read jobs.",
            access: "read_only",
          },
          {
            key: "crew.read",
            label: "Crew",
            description: "Read crew.",
            access: "read_only",
          },
          {
            key: "equipment.read",
            label: "Equipment",
            description: "Read equipment.",
            access: "read_only",
          },
        ],
        status: {
          state: "unconfigured",
          configured: false,
          available: false,
          message:
            "Yard Workers read access is ready but the access token and API key are not configured.",
          retryable: false,
        },
      },
    ],
  };
}

describe("BusinessView", () => {
  test(
    "shows Build 039 with live connectors awaiting credentials",
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
        expect(
          screen.getByRole("button", {
            name: "Read Bookings",
          }),
        ).toBeDisabled();
        expect(
          screen.getByText(
            /Configure the Rosie Dazzlers staff session token in Secrets/i,
          ),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", {
            name: "Read Clients",
          }),
        ).toBeDisabled();
        expect(
          screen.getByText(
            /Configure both the Yard Workers access token and API key in Secrets/i,
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
            /More records are available for this resource/,
          ),
        ).toBeInTheDocument();
      });
    },
  );

  test(
    "loads a bounded Rosie Dazzlers jobs preview",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/rosiedazzlers/read/jobs")) {
            return {
              ok: true,
              json: async () => ({
                connector_key: "rosiedazzlers",
                resource: "jobs",
                records: [
                  {
                    booking_id: "booking-42",
                    customer_name: "Customer One",
                    job_status: "scheduled",
                  },
                ],
                next_cursor: null,
              }),
            };
          }
          const payload = connectorPayload(false);
          payload.connectors[1].status = {
            state: "configured",
            configured: true,
            available: false,
            message: "Rosie Dazzlers read access is configured.",
            retryable: false,
          };
          return {
            ok: true,
            json: async () => payload,
          };
        }),
      );

      render(<BusinessView />);

      const buttons = await screen.findAllByRole(
        "button",
        { name: "Read Jobs" },
      );
      const button = buttons.find(
        (candidate) => !(candidate as HTMLButtonElement).disabled,
      );
      expect(button).toBeDefined();
      expect(button).toBeEnabled();
      fireEvent.click(button!);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /Rosie Dazzlers Jobs — 1 record/,
          }),
        ).toBeInTheDocument();
        expect(screen.getByText(/booking-42/)).toBeInTheDocument();
        expect(screen.getByText(/Customer One/)).toBeInTheDocument();
      });
    },
  );

  test(
    "loads a bounded Yard Workers equipment preview",
    async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: RequestInfo | URL) => {
          const url = String(input);
          if (url.includes("/yardworkers/read/equipment")) {
            return {
              ok: true,
              json: async () => ({
                connector_key: "yardworkers",
                resource: "equipment",
                records: [
                  {
                    equipment_id: "equipment-42",
                    equipment_code: "EQ-42",
                    item_name: "Commercial mower",
                  },
                ],
                next_cursor: null,
              }),
            };
          }
          const payload = connectorPayload(false);
          payload.connectors[2].status = {
            state: "configured",
            configured: true,
            available: false,
            message: "Yard Workers read access is configured.",
            retryable: false,
          };
          return {
            ok: true,
            json: async () => payload,
          };
        }),
      );

      render(<BusinessView />);

      const button = await screen.findByRole(
        "button",
        { name: "Read Equipment" },
      );
      expect(button).toBeEnabled();
      fireEvent.click(button);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /Yard Workers Equipment — 1 record/,
          }),
        ).toBeInTheDocument();
        expect(screen.getByText(/equipment-42/)).toBeInTheDocument();
        expect(screen.getByText(/Commercial mower/)).toBeInTheDocument();
      });
    },
  );

});
