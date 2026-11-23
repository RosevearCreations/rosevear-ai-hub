import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";

import {FamilyCalendar379, matchesFamilyView379} from "./FamilyCalendar379";
import type {FamilyBoard379, FamilyPlan379} from "./api";

const item: FamilyPlan379 = {
  id: 42, title: "Test daily check", kind: "chore", detail: "",
  supplies: "paper", visibility: "household",
  localDue: "2027-05-09T14:00", timezone: "America/Toronto",
  dueAtUtc: "2027-05-09T18:00:00+00:00",
  recurrenceDays: 1, reminderMinutes: 30,
  reminderAtUtc: "2027-05-09T17:30:00+00:00",
  reminderDue: false, reminderAcknowledged: false,
  reminderAcknowledgedAt: null, missed: false,
  status: "open", revision: 1, completionCount: 0,
  lastCompletedAt: null, creatorUserId: 3, assigneeUserId: 3,
  automaticMessagesSent: 0,
};
const board: FamilyBoard379 = {
  schema: "rosevear.hub.family-calendar.v379",
  timezonePolicy: "IANA_ZONE_EXPLICIT_DST_GAPS_AND_FOLDS_REJECTED",
  role: "household_user", items: [item], history: [],
  summary: {active: 1, dueSoon: 0, missed: 0, recurring: 1},
  truncated: false, remindersAreInAppReadbackOnly: true,
  backgroundSchedulerEnabled: false, outboundNotificationsEnabled: false,
  externalCalendarSyncEnabled: false, automaticDeviceActionsEnabled: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("Build379 read-only sees safe month view but cannot mutate or dispatch", async () => {
  const calls: Array<{url:string; method:string}> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({url, method: init?.method ?? "GET"});
    return {
      ok: true, json: async () => url.endsWith("/members")
        ? {members: []} : board,
    };
  }));
  const viewer = render(<FamilyCalendar379 role="read_only" currentUserId={12} />);
  expect(await screen.findByRole("heading", {name:"Test daily check"})).toBeInTheDocument();
  expect(screen.getByRole("table", {name:/Household schedule/})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name:"Complete"})).toBeNull();
  expect(screen.queryByRole("button", {name:"Add to family calendar"})).toBeNull();
  expect(calls.every(x => x.method === "GET")).toBe(true);
  viewer.unmount();

  render(<FamilyCalendar379 role="household_user" currentUserId={3} />);
  expect(await screen.findByRole("heading", {name:"Test daily check"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Complete"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name:"Add to family calendar"})).toBeInTheDocument();
  expect(screen.getByText(/no background/gi)).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", {name:"Show"}), {
    target: {value:"chores"},
  });
  await waitFor(() => expect(screen.getByRole("heading", {name:"Test daily check"}))
    .toBeInTheDocument());
  expect(matchesFamilyView379(item, "chores", "2027-05-09")).toBe(true);
  expect(matchesFamilyView379(item, "missed", "2027-05-09")).toBe(false);
  expect(calls.every(x => x.method === "GET")).toBe(true);
});
