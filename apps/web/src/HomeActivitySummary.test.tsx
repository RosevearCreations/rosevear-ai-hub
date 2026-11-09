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

  test("filters urgent, warning and unread triage locally without acknowledging or refetching", async () => {
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="owner" allowed={["Notifications"]} onNavigate={onNavigate} />);
    const section = await screen.findByRole("region", { name: "Priority follow-ups" });
    await waitFor(() => expect(within(section).getAllByRole("listitem")).toHaveLength(2));
    const selector = within(section).getByRole("combobox", { name: "Show follow-ups" });
    fireEvent.change(selector, { target: { value: "urgent" } });
    expect(within(section).getAllByRole("listitem")).toHaveLength(1);
    expect(within(section).getByRole("listitem")).toHaveTextContent("System attention");
    fireEvent.change(selector, { target: { value: "unread" } });
    expect(within(section).getByRole("listitem")).toHaveTextContent("Pump check");
    fireEvent.change(selector, { target: { value: "verify" } });
    expect(within(section).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(section).getByText(/No follow-ups match this filter/)).toBeInTheDocument();
    expect(within(section).getByText(/2 total in this sampled view/)).toBeInTheDocument();
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Unread 1");
    fireEvent.click(within(section).getByRole("button", { name: "Show all alerts" }));
    expect(within(section).getAllByRole("listitem")).toHaveLength(2);
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotificationSummary).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("retains only allowed navigation after filtering a read-only user's alerts", async () => {
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={{ backend: "offline", localAi: "offline", modelCount: null }}
      role="read_only" allowed={["Home", "Search & Help"]} onNavigate={onNavigate} />);
    const section = await screen.findByRole("region", { name: "Priority follow-ups" });
    await waitFor(() => expect(within(section).getAllByRole("listitem").length).toBeGreaterThan(1));
    fireEvent.change(within(section).getByRole("combobox", { name: "Show follow-ups" }), { target: { value: "urgent" } });
    expect(within(section).getByRole("listitem")).toHaveTextContent("System attention");
    expect(within(section).queryByRole("button", { name: "Open Notifications" })).not.toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: "Show all alerts" }));
    fireEvent.click(within(section).getAllByRole("button", { name: "Open Search & Help" })[0]);
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("Search & Help");
  });

  test("Build 276 previews bounded inbox source context and restores Home alert focus without writes", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [
      { ...notifications[0], message: "Water level needs a visual review.", source_type: "automation",
        source_id: "secret-cabinet-controller" }, notifications[1],
    ], total: 2, limit: 10, offset: 0 } as never);
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="owner" allowed={["Home", "Notifications"]} onNavigate={onNavigate} />);
    const followups = screen.getByRole("region", { name: "Priority follow-ups" });
    const trigger = await within(followups).findByRole("button", { name: "Preview details for Pump check" });
    fireEvent.click(trigger);
    const preview = within(followups).getByRole("region", { name: "Alert detail preview" });
    await waitFor(() => expect(preview).toHaveFocus());
    expect(preview).toHaveTextContent("Local notification inbox");
    expect(preview).toHaveTextContent("Notification #1");
    expect(preview).toHaveTextContent("automation");
    expect(preview).toHaveTextContent("Water level needs a visual review.");
    expect(preview).toHaveTextContent("not independently verified device activity");
    expect(preview).not.toHaveTextContent("secret-cabinet-controller");
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotificationSummary).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(within(preview).getByRole("button", { name: "Return to Home alerts" }));
    expect(within(followups).queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("Build 276 hides restricted notification content and closes stale previews on filter or refresh", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [
      { ...notifications[0], message: "Restricted internal message", source_type: "automation" }, notifications[1],
    ], total: 2, limit: 10, offset: 0 } as never);
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="read_only" allowed={["Home"]} onNavigate={onNavigate} />);
    const followups = screen.getByRole("region", { name: "Priority follow-ups" });
    fireEvent.click(await within(followups).findByRole("button", { name: "Preview details for Pump check" }));
    const preview = within(followups).getByRole("region", { name: "Alert detail preview" });
    expect(preview).toHaveTextContent("Restricted to notification inbox access");
    expect(preview).toHaveTextContent("Additional notification content is available only");
    expect(preview).not.toHaveTextContent("Restricted internal message");
    expect(preview).not.toHaveTextContent("Notification #1");
    expect(within(preview).queryByRole("button", { name: /Open Notifications/ })).not.toBeInTheDocument();
    const filter = within(followups).getByRole("combobox", { name: "Show follow-ups" });
    fireEvent.change(filter, { target: { value: "urgent" } });
    expect(within(followups).queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    fireEvent.click(within(followups).getByRole("button", { name: "Preview details for System attention" }));
    expect(within(followups).getByRole("region", { name: "Alert detail preview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh activity" }));
    expect(within(followups).queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(getNotifications).toHaveBeenCalledTimes(2);
  });

  test("Build 276 identifies current health observations as unverified, not as inbox events", async () => {
    render(<HomeActivitySummary health={{ backend: "offline", localAi: "online", modelCount: 2 }}
      role="read_only" allowed={["Home", "Search & Help"]} onNavigate={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Preview details for Local Hub needs review" });
    fireEvent.click(trigger);
    const preview = screen.getByRole("region", { name: "Alert detail preview" });
    expect(preview).toHaveTextContent("Current Hub backend health request");
    expect(preview).toHaveTextContent("No recorded event ID");
    expect(preview).toHaveTextContent("not a recorded event or proof of overall system health");
    expect(within(preview).getByRole("button", { name: "Open Search & Help to review source" })).toBeInTheDocument();
  });

  test("Build 277 searches and filters the loaded page without changing verified counts or touching inbox state", async () => {
    const firstPage = Array.from({ length: 10 }, (_, i) => ({
      ...notifications[0], id: i + 1, title: `Pump ${i + 1} review`, created_at: `2026-11-08T12:${String(i).padStart(2, "0")}:00Z`,
    }));
    const lastPage = [{ ...notifications[1], id: 11, title: "Garage review" },
      { ...notifications[0], id: 12, title: "Garden review" }];
    vi.mocked(getNotifications).mockImplementation(async options => ({
      notifications: options?.offset === 10 ? lastPage : firstPage, total: 12, limit: 10, offset: options?.offset ?? 0,
    }) as never);
    vi.mocked(getNotificationSummary).mockResolvedValue({ ...summary, total: 12, unread: 8, urgent: 2, warning: 10 });
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="owner" allowed={["Home", "Notifications"]} onNavigate={onNavigate} />);
    const followups = screen.getByRole("region", { name: "Priority follow-ups" });
    await waitFor(() => expect(within(followups).getAllByRole("listitem")).toHaveLength(10));
    expect(screen.getByRole("navigation", { name: "Notification follow-up pages" })).toHaveTextContent("Inbox page 1 of 2");
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Unread 8");
    expect(screen.getByRole("button", { name: "Previous inbox page" })).toBeDisabled();
    fireEvent.change(within(followups).getByRole("searchbox", { name: "Search loaded page" }), { target: { value: "PUMP 2" } });
    expect(within(followups).getAllByRole("listitem")).toHaveLength(1);
    expect(within(followups).getByRole("listitem")).toHaveTextContent("Pump 2 review");
    fireEvent.change(within(followups).getByRole("combobox", { name: "Source" }), { target: { value: "backend" } });
    expect(within(followups).queryByRole("listitem")).not.toBeInTheDocument();
    expect(within(followups).getByText(/Other pages and priorities may still need attention/)).toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledTimes(1);
    fireEvent.click(within(followups).getByRole("button", { name: "Show all alerts" }));
    expect(within(followups).getAllByRole("listitem")).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Next inbox page" }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Notification follow-up pages" })).toHaveTextContent("Inbox page 2 of 2"));
    expect(within(followups).getAllByRole("listitem")).toHaveLength(2);
    expect(within(followups).queryByText("Pump 2 review")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next inbox page" })).toBeDisabled();
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Unread 8");
    fireEvent.click(within(followups).getByRole("button", { name: "Preview details for Garage review" }));
    expect(within(followups).getByRole("region", { name: "Alert detail preview" })).toHaveTextContent("Notification #11");
    fireEvent.click(screen.getByRole("button", { name: "Previous inbox page" }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Notification follow-up pages" })).toHaveTextContent("Inbox page 1 of 2"));
    expect(within(followups).queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    expect(getNotifications).toHaveBeenCalledTimes(3);
    expect(getNotificationSummary).toHaveBeenCalledTimes(3);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("Build 277 treats a malformed later page as unavailable, never as a clean inbox", async () => {
    vi.mocked(getNotifications).mockImplementation(async options => options?.offset === 10
      ? ({ notifications: [], total: 12, limit: 10, offset: 0 } as never)
      : ({ notifications: [notifications[0]], total: 12, limit: 10, offset: 0 } as never));
    render(<HomeActivitySummary health={healthy} role="read_only" allowed={["Home"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Inbox page 1 of 2/);
    fireEvent.click(screen.getByRole("button", { name: "Next inbox page" }));
    expect(await screen.findByText(/History unavailable/)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Notification follow-up pages" })).toHaveTextContent("total pages not verified");
    expect(screen.getByRole("button", { name: "Next inbox page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous inbox page" })).toBeEnabled();
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Not verified");
    expect(screen.queryByText(/No priority issues were identified/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous inbox page" }));
    await screen.findByText(/Inbox page 1 of 2/);
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Unread 1");
  });

  test("Build 277 limits source search to alert summaries and preserves restricted content and safe routes", async () => {
    vi.mocked(getNotifications).mockResolvedValue({ notifications: [{ ...notifications[0],
      message: "private-garage-code", source_type: "camera", source_id: "confidential-source" }], total: 1, limit: 10, offset: 0 } as never);
    render(<HomeActivitySummary health={{ backend: "offline", localAi: "online", modelCount: 2 }} role="read_only"
      allowed={["Home", "Search & Help"]} onNavigate={vi.fn()} />);
    const followups = screen.getByRole("region", { name: "Priority follow-ups" });
    await within(followups).findByRole("button", { name: "Preview details for Pump check" });
    fireEvent.change(within(followups).getByRole("searchbox", { name: "Search loaded page" }), { target: { value: "private-garage-code" } });
    expect(within(followups).queryByRole("listitem")).not.toBeInTheDocument();
    fireEvent.change(within(followups).getByRole("searchbox", { name: "Search loaded page" }), { target: { value: "Local Hub" } });
    fireEvent.change(within(followups).getByRole("combobox", { name: "Source" }), { target: { value: "backend" } });
    expect(within(followups).getByRole("listitem")).toHaveTextContent("Local Hub needs review");
    expect(screen.queryByText("private-garage-code")).not.toBeInTheDocument();
    expect(screen.queryByText("confidential-source")).not.toBeInTheDocument();
    expect(within(followups).queryByRole("button", { name: "Open Notifications" })).not.toBeInTheDocument();
  });

  test("Build 279 saves personal review views, keeps filters through paging and restores an alert bookmark on return", async () => {
    localStorage.clear(); sessionStorage.clear();
    const firstPage = Array.from({ length: 10 }, (_, i) => ({ ...notifications[0], id: i + 1,
      title: `Pump ${i + 1} review` }));
    const secondPage = [{ ...notifications[1], id: 11, title: "Garage warning", severity: "warning" }];
    vi.mocked(getNotifications).mockImplementation(async options => ({
      notifications: options?.offset === 10 ? secondPage : firstPage, total: 11, limit: 10,
      offset: options?.offset ?? 0,
    }) as never);
    vi.mocked(getNotificationSummary).mockResolvedValue({ ...summary, total: 11, unread: 10, urgent: 0, warning: 11 });
    const onNavigate = vi.fn();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={7}
      allowed={["Home", "Notifications"]} onNavigate={onNavigate} />);
    const followups = screen.getByRole("region", { name: "Priority follow-ups" });
    await within(followups).findByRole("button", { name: "Preview details for Pump 1 review" });
    fireEvent.change(within(followups).getByRole("combobox", { name: "Source" }), { target: { value: "notification" } });
    fireEvent.change(within(followups).getByRole("combobox", { name: "Show follow-ups" }), { target: { value: "warning" } });
    fireEvent.change(within(followups).getByRole("searchbox", { name: "Search loaded page" }), { target: { value: "Pump" } });
    fireEvent.change(within(followups).getByRole("textbox", { name: "View name" }), { target: { value: "Daily alerts" } });
    fireEvent.click(within(followups).getByRole("button", { name: "Save current alert filters" }));
    expect(within(followups).getByRole("combobox", { name: "Saved views" })).toHaveValue("view-1");
    fireEvent.click(within(followups).getByRole("button", { name: "Next inbox page" }));
    await screen.findByText(/Inbox page 2 of 2/);
    expect(within(followups).getByRole("searchbox", { name: "Search loaded page" })).toHaveValue("Pump");
    fireEvent.click(within(followups).getByRole("button", { name: "Show all alerts" }));
    fireEvent.click(await within(followups).findByRole("button", { name: "Preview details for Garage warning" }));
    fireEvent.click(within(followups).getByRole("button", { name: "Bookmark for later review" }));
    expect(within(followups).getByRole("navigation", { name: "Saved alert bookmarks" })).toHaveTextContent("notification #11");
    expect(within(followups).getByRole("button", { name: "Remove review bookmark" })).toHaveAttribute("aria-pressed", "true");
    cleanup();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={7}
      allowed={["Home", "Notifications"]} onNavigate={onNavigate} />);
    await screen.findByText(/Inbox page 2 of 2/);
    expect(screen.getByRole("region", { name: "Alert detail preview" })).toHaveTextContent("Notification #11");
    expect(screen.getByRole("combobox", { name: "Saved views" })).toHaveValue("");
    fireEvent.change(screen.getByRole("combobox", { name: "Saved views" }), { target: { value: "view-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply saved view" }));
    expect(screen.getByRole("searchbox", { name: "Search loaded page" })).toHaveValue("Pump");
    expect(screen.queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("Build 279 keeps bookmarks read-only and scoped to authenticated account", async () => {
    localStorage.clear(); sessionStorage.clear();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={9}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview details for Pump check" }));
    fireEvent.click(screen.getByRole("button", { name: "Bookmark for later review" }));
    expect(screen.getByRole("navigation", { name: "Saved alert bookmarks" })).toHaveTextContent("notification #1");
    cleanup();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={10}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Last inbox check:/);
    expect(screen.getByRole("navigation", { name: "Saved alert bookmarks" })).toHaveTextContent("No alert bookmarks saved");
    cleanup();
    render(<HomeActivitySummary health={healthy} role="read_only" accountId={9}
      allowed={["Home"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Last inbox check:/);
    expect(screen.getByRole("navigation", { name: "Saved alert bookmarks" })).toHaveTextContent("require access to the notification inbox");
    expect(screen.queryByRole("button", { name: /Go to notification #1/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview details for Pump check" }));
    expect(screen.queryByRole("button", { name: "Bookmark for later review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Notifications" })).not.toBeInTheDocument();
  });

  test("Build 279 never treats a moved or missing bookmarked notification as reviewed", async () => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem("rosevear-ai-hub:alert-review:v1:12:views", JSON.stringify({
      version: 1, views: [], bookmarks: [{ notificationId: 99, pageOffset: 10 }],
    }));
    vi.mocked(getNotifications).mockImplementation(async options => ({
      notifications: [notifications[0]], total: 11, limit: 10, offset: options?.offset ?? 0,
    }) as never);
    render(<HomeActivitySummary health={healthy} role="owner" accountId={12}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to notification #99, page 2" }));
    await screen.findByText(/Inbox page 2 of 2/);
    expect(screen.getByText(/previously selected alert is not available/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Alert detail preview" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Local notification counts")).toHaveTextContent("Unread 1");
  });

  test("Build 280 saves an owner's personal note and timeline without changing inbox state", async () => {
    localStorage.clear(); sessionStorage.clear();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={31}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview details for Pump check" }));
    const editor = screen.getByRole("region", { name: "Personal alert follow-up notes" });
    fireEvent.change(within(editor).getByRole("combobox", { name: "Personal review status" }),
      { target: { value: "investigating" } });
    fireEvent.change(within(editor).getByRole("textbox", { name: "Personal follow-up note" }),
      { target: { value: "Checked local readings; follow up tomorrow." } });
    fireEvent.click(within(editor).getByRole("button", { name: "Save local review note" }));
    expect(within(editor).getByRole("status")).toHaveTextContent("The inbox and alert status were not changed");
    expect(within(editor).getByText("Checked local readings; follow up tomorrow.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Personal follow-up review history" })).toHaveTextContent("Investigating");
    const stored = JSON.parse(localStorage.getItem("rosevear-ai-hub:local-follow-up:v1:31") ?? "null");
    expect(stored.entries).toEqual([expect.objectContaining({ notificationId: 1, outcome: "investigating" })]);
    expect(JSON.stringify(stored)).not.toContain("Pump check");
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(getNotificationSummary).toHaveBeenCalledTimes(1);
    cleanup();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={31}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    expect(await screen.findByRole("region", { name: "Personal follow-up review history" })).toHaveTextContent("Investigating");
    expect(screen.getByRole("region", { name: "Personal alert follow-up notes" })).toHaveTextContent("Checked local readings");
  });

  test("Build 280 hides personal journal across accounts and from read-only roles", async () => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem("rosevear-ai-hub:local-follow-up:v1:32", JSON.stringify({ version: 1, entries: [{
      id: 1, notificationId: 1, pageOffset: 0, outcome: "needs_review",
      note: "Private owner observation", recordedAt: "2026-11-08T15:00:00.000Z",
    }] }));
    render(<HomeActivitySummary health={healthy} role="owner" accountId={33}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Last inbox check:/);
    expect(screen.queryByText("Private owner observation")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Personal follow-up review history" })).toHaveTextContent("No personal follow-up entries");
    cleanup();
    render(<HomeActivitySummary health={healthy} role="read_only" accountId={32}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview details for Pump check" }));
    expect(screen.queryByRole("region", { name: "Personal follow-up review history" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Personal alert follow-up notes" })).not.toBeInTheDocument();
    expect(screen.queryByText("Private owner observation")).not.toBeInTheDocument();
  });

  test("Build 280 fails closed if browser storage cannot save the local note", async () => {
    localStorage.clear(); sessionStorage.clear();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={34}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Preview details for Pump check" }));
    const editor = screen.getByRole("region", { name: "Personal alert follow-up notes" });
    fireEvent.change(within(editor).getByRole("textbox", { name: "Personal follow-up note" }),
      { target: { value: "Review is incomplete" } });
    const storageStub = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("blocked"); });
    try {
      fireEvent.click(within(editor).getByRole("button", { name: "Save local review note" }));
      expect(within(editor).getByRole("status")).toHaveTextContent("Nothing was saved");
      expect(within(editor).getByText("No personal review history for this notification.")).toBeInTheDocument();
      expect(localStorage.getItem("rosevear-ai-hub:local-follow-up:v1:34")).toBeNull();
    } finally { storageStub.mockRestore(); }
  });

  test("Build 281 filters and prioritizes locally tracked reviews, navigates safely to their recorded page", async () => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem("rosevear-ai-hub:local-follow-up:v1:281", JSON.stringify({ version: 1, entries: [
      { id: 1, notificationId: 11, pageOffset: 10, outcome: "follow_up",
        note: "Need a check", recordedAt: "2026-10-01T12:00:00.000Z" },
      { id: 2, notificationId: 1, pageOffset: 0, outcome: "reviewed_locally",
        note: "Reviewed manually", recordedAt: "2026-10-03T12:00:00.000Z" },
    ] }));
    vi.mocked(getNotifications).mockImplementation(async options => ({
      notifications: options?.offset === 10 ? [{ ...notifications[1], id: 11, title: "Garage alert" }] : [notifications[0]],
      total: 11, limit: 10, offset: options?.offset ?? 0,
    }) as never);
    render(<HomeActivitySummary health={healthy} role="owner" accountId={281}
      allowed={["Home", "Notifications"]} onNavigate={vi.fn()} />);
    const queue = screen.getByRole("region", { name: "Owner follow-up review queue" });
    await screen.findByText(/Inbox page 1 of 2/);
    expect(queue).toHaveTextContent("1 needing personal follow-up");
    expect(queue).toHaveTextContent("High personal priority");
    expect(within(queue).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(within(queue).getByRole("combobox", { name: "Review status" }), { target: { value: "reviewed_locally" } });
    expect(queue).toHaveTextContent("Notification #1");
    expect(queue).toHaveTextContent("Reviewed locally (not resolved)");
    expect(queue).not.toHaveTextContent("Need a check");
    fireEvent.change(within(queue).getByRole("combobox", { name: "Review status" }), { target: { value: "outstanding" } });
    fireEvent.change(within(queue).getByRole("combobox", { name: "Time since local note" }), { target: { value: "overdue" } });
    fireEvent.change(within(queue).getByRole("combobox", { name: "Personal review priority" }), { target: { value: "high" } });
    expect(within(queue).getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(within(queue).getByRole("button", { name: "Review locally tracked notification #11" }));
    await screen.findByText(/Inbox page 2 of 2/);
    expect(screen.getByRole("region", { name: "Alert detail preview" })).toHaveTextContent("Notification #11");
    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(getNotificationSummary).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("rosevear-ai-hub:local-follow-up:v1:281")).toContain("Need a check");
  });

  test("Build 281 hides owner queue without notification access or administrator permissions", async () => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem("rosevear-ai-hub:local-follow-up:v1:282", JSON.stringify({ version: 1, entries: [{
      id: 1, notificationId: 1, pageOffset: 0, outcome: "follow_up", note: "Private local review",
      recordedAt: "2026-10-01T12:00:00.000Z",
    }] }));
    render(<HomeActivitySummary health={healthy} role="read_only" accountId={282}
      allowed={["Notifications"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Last inbox check:/);
    expect(screen.queryByRole("region", { name: "Owner follow-up review queue" })).not.toBeInTheDocument();
    cleanup();
    render(<HomeActivitySummary health={healthy} role="owner" accountId={282}
      allowed={["Home"]} onNavigate={vi.fn()} />);
    await screen.findByText(/Last inbox check:/);
    expect(screen.queryByRole("region", { name: "Owner follow-up review queue" })).not.toBeInTheDocument();
  });
});
