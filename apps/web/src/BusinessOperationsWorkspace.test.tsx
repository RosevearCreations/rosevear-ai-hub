import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { BusinessConnectorRecord } from "./api";
import { BusinessOperationsWorkspace } from "./BusinessOperationsWorkspace";

const connector: BusinessConnectorRecord = {
  key: "rosiedazzlers",
  display_name: "Rosie Dazzlers",
  description: "Read-first operations",
  planned_build: 38,
  access_mode: "read_only",
  writes_require_confirmation: true,
  status: {
    state: "configured",
    configured: true,
    available: false,
    message: "Configured",
    retryable: false,
  },
  capabilities: [
    { key: "jobs.read", label: "Jobs", description: "Read jobs", access: "read_only" },
    { key: "inventory.read", label: "Inventory", description: "Read inventory", access: "read_only" },
  ],
};

afterEach(cleanup);

describe("BusinessOperationsWorkspace", () => {
  test("does not mistake configured credentials for a verified read", () => {
    const onRefresh = vi.fn();
    render(
      <BusinessOperationsWorkspace
        connectors={[connector]}
        evidence={{}}
        checkedAt={null}
        refreshing={false}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByText(/Credentials configured/)).toBeInTheDocument();
    expect(screen.getByText(/0 of 2 resources/)).toBeInTheDocument();
    expect(screen.getAllByText(/Not read in this session/)).toHaveLength(2);
    expect(screen.getByText(/Source record age is unknown/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh connector readiness" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  test("records resource-scoped successful and failed observations without record values", () => {
    const { container } = render(
      <BusinessOperationsWorkspace
        connectors={[connector]}
        evidence={{
          rosiedazzlers: {
            jobs: {
              state: "verified",
              checkedAt: "2026-10-12T18:30:00.000Z",
              recordCount: 20,
              hasMore: true,
            },
            inventory: {
              state: "failed",
              checkedAt: "2026-10-12T18:31:00.000Z",
            },
          },
        }}
        checkedAt="2026-10-12T18:29:00.000Z"
        refreshing={true}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/1 of 2 resources/)).toBeInTheDocument();
    expect(screen.getByText(/Read 20 record\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/additional pages available/)).toBeInTheDocument();
    expect(screen.getByText(/Read failed at/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checking readiness…" })).toBeDisabled();
    expect(container.textContent).not.toContain("Customer One");
  });

  test("unconfigured systems never show a remote availability claim", () => {
    render(
      <BusinessOperationsWorkspace
        connectors={[{ ...connector, status: { ...connector.status, configured: false } }]}
        evidence={{}}
        checkedAt={null}
        refreshing={false}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText(/Needs setup in Secrets/)).toBeInTheDocument();
    expect(screen.queryByText("Online")).not.toBeInTheDocument();
  });
});
