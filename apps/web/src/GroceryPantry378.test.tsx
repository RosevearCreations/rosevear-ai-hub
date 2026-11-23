import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { GroceryPantry378, matchesGroceryFilter378 } from "./GroceryPantry378";
import type { GroceryBoard378, GroceryItem378 } from "./api";

const milk: GroceryItem378 = {
  id: 1, name: "Milk", unit: "L", wantedQty: 2.5, onHandQty: 0.5,
  minOnHandQty: 1, recurrenceDays: 7, lastPickedUpOn: "2026-11-14",
  expiresOn: "2026-11-24", pickupOn: "2026-11-23", priceNote: "About $5 CAD",
  note: "family request", state: "draft", revision: 1,
  approvedAt: null, approvedByUserId: null, lowStock: true,
  expiresSoon: true, recurrenceDue: true, pickupReady: false,
  manualInventoryOnly: true,
};
const board: GroceryBoard378 = {
  schema: "rosevear.hub.grocery.v378", source: "PRIVATE_LOCAL_HOUSEHOLD_ONLY",
  role: "owner", items: [milk], duplicateGroups: [], history: [],
  summary: {active: 1, lowStock: 1, expiring: 1, recurringDue: 1, approvedPickupLines: 0},
  truncated: false, retailerConnected: false, orderingEnabled: false,
  paymentsEnabled: false, externalMessagesEnabled: false,
  householdApprovalRequired: true,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("Build 378 renders a real role-restricted board and never orders implicitly", async () => {
  const calls: Array<{method: string; url: string}> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    calls.push({method, url});
    return {
      ok: true,
      json: async () => board,
    };
  }));

  const viewer = render(<GroceryPantry378 role="read_only" />);
  expect(await screen.findByText("Milk")).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Approve pickup"})).toBeNull();
  expect(screen.queryByRole("button", {name: "Add to household board"})).toBeNull();
  expect(calls.map(call => call.method)).toEqual(["GET"]);
  expect(screen.getByText(/cannot buy, pay for, or order anything/)).toBeInTheDocument();
  viewer.unmount();

  render(<GroceryPantry378 role="owner" />);
  expect(await screen.findByText("Milk")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Approve pickup"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Add to household board"})).toBeInTheDocument();
  expect(calls.every(call => call.url.includes("/api/v1/groceries-378/board"))).toBe(true);
  expect(screen.getByRole("button", {name: "Print approved pickup list"})).toBeDisabled();
  expect(matchesGroceryFilter378(milk, "low")).toBe(true);
  expect(matchesGroceryFilter378(milk, "ready")).toBe(false);
  fireEvent.change(screen.getByRole("combobox", {name: "View"}), {
    target: {value: "low"},
  });
  await waitFor(() => expect(screen.getByText("Milk")).toBeInTheDocument());
});
