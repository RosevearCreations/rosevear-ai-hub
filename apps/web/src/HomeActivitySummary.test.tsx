import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { getNotifications, getNotificationSummary } from "./api";
import { HomeActivitySummary } from "./HomeActivitySummary";

vi.mock("./api", () => ({ getNotifications: vi.fn(), getNotificationSummary: vi.fn() }));

const summary = { total: 2, unread: 1, info: 0, warning: 1, urgent: 1, newest_at: "2026-11-08T12:00:00Z" };
const notifications = [
  { id: 1, title: "Pump check", severity: "warning", unread: true, created_at: "2026-11-08T11:00:00Z" },
  { id: 2, title: "System attention", severity: "urgent", unread: false, created_at: "2026-11-08T12:00:00Z" },
];
const healthy = { backend: "online" as const, localAi: "online" as const, modelCount: 2 };

describe("Build 274 Home activity and alerts", () => {
  beforeEach(() => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications, total: 2, limit: 10, offset: 0 } as never);
    vi.mocked(getNotificationSummary).mockResolvedValue(summary);
  });
  afterEach(() => { cleanup(); vi.resetAllMocks(); });

  test("shows real priority alerts, timestamps and read-only navigation without writes", async () => {
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="owner" allowed={["Home", "Notifications", "System"]}
      onNavigate={onNavigate} />);
    const panel = screen.getByRole("region", { name: "Activity and priority alerts" });
    await waitFor(() => expect(within(panel).getByText("Last inbox check:", { exact: false })).toBeInTheDocument());
    const priority = within(panel).getByRole("region", { name: "Priority follow-ups" });
    expect(within(priority).getAllByRole("listitem")).toHaveLength(2);
    expect(within(priority).getAllByRole("listitem")[0]).toHaveTextContent("System attention");
    expect(within(panel).getByRole("region", { name: "Recent local notification activity" })).toHaveTextContent("Pump check");
    fireEvent.click(within(panel).getByRole("button", { name: "Open notification inbox" }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("Notifications");
    expect(getNotifications).toHaveBeenCalledWith(expect.objectContaining({ status: "all", limit: 10 }));
    expect(getNotificationSummary).toHaveBeenCalledOnce();
  });

  test("keeps unavailable history unverified and offers only permitted routes", async () => {
    vi.mocked(getNotifications).mockRejectedValue(new Error("private service failed"));
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={{ backend: "offline", localAi: "offline", modelCount: null }}
      role="read_only" allowed={["Home", "Search & Help"]} onNavigate={onNavigate} />);
    expect(await screen.findByText(/History unavailable/)).toBeInTheDocument();
    expect(screen.getAllByText("Not verified")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Open notification inbox" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Open Search & Help" })[0]);
    expect(onNavigate).toHaveBeenCalledWith("Search & Help");
  });

  test("has truthful empty states and explicitly refreshes only by user choice", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [], total: 0, limit: 10, offset: 0 });
    vi.mocked(getNotificationSummary).mockResolvedValue({ ...summary, total: 0, unread: 0, urgent: 0, warning: 0 });
    render(<HomeActivitySummary health={healthy} role="owner" allowed={["Notifications"]} onNavigate={vi.fn()} />);
    expect(await screen.findByText(/No notifications returned by the local inbox/)).toBeInTheDocument();
    expect(screen.getByText(/No priority issues were identified/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh activity" }));
    await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(2));
  });

  test("rejects malformed local inbox results rather than displaying a false clean state", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [{ id: 5, title: "Fake", severity: "unknown" }] } as never);
    render(<HomeActivitySummary health={healthy} role="read_only" allowed={[]} onNavigate={vi.fn()} />);
    expect(await screen.findByText(/History unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/No priority issues were identified/)).not.toBeInTheDocument();
  });
});
