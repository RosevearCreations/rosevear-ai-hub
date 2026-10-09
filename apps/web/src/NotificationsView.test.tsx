import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NotificationsView } from "./NotificationsView";
import type { AuthUser } from "./api";

const owner: AuthUser = {
  id: 1,
  username: "owner",
  role: "owner",
  enabled: true,
  created_at: "2026-10-08T20:00:00Z",
};

function response(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload };
}

describe("NotificationsView", () => {
  let unread = true;
  let dismissed = false;

  beforeEach(() => {
    unread = true;
    dismissed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";

        if (url.endsWith("/api/v1/notifications/summary")) {
          return response({
            total: dismissed ? 0 : 1,
            unread: dismissed || !unread ? 0 : 1,
            info: 0,
            warning: dismissed ? 0 : 1,
            urgent: 0,
            newest_at: dismissed ? null : "2026-10-08T22:30:00Z",
          });
        }
        if (url.includes("/api/v1/notifications?")) {
          return response({
            notifications: dismissed
              ? []
              : [
                  {
                    id: 7,
                    audience: "household",
                    title: "Workshop temperature",
                    message: "Workshop temperature needs attention.",
                    severity: "warning",
                    source_type: "automation",
                    source_id: null,
                    created_by_user_id: null,
                    created_at: "2026-10-08T22:30:00Z",
                    read_at: unread ? null : "2026-10-08T22:31:00Z",
                    dismissed_at: null,
                    unread,
                  },
                ],
            total: dismissed ? 0 : 1,
            limit: 50,
            offset: 0,
          });
        }
        if (url.endsWith("/api/v1/notifications/7/read") && method === "POST") {
          unread = false;
          return response({
            id: 7,
            audience: "household",
            title: "Workshop temperature",
            message: "Workshop temperature needs attention.",
            severity: "warning",
            source_type: "automation",
            source_id: null,
            created_by_user_id: null,
            created_at: "2026-10-08T22:30:00Z",
            read_at: "2026-10-08T22:31:00Z",
            dismissed_at: null,
            unread: false,
          });
        }
        if (url.endsWith("/api/v1/notifications/7/dismiss") && method === "POST") {
          dismissed = true;
          return response({ updated: 1 });
        }
        if (url.endsWith("/api/v1/notifications/read-all") && method === "POST") {
          unread = false;
          return response({ updated: 1 });
        }
        if (url.endsWith("/api/v1/notifications/test") && method === "POST") {
          return { ...response({ id: 8 }), status: 201 };
        }
        return { ok: false, status: 404, json: async () => ({ detail: "Not found" }) };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("shows durable alerts and supports local read and dismiss state", async () => {
    render(<NotificationsView currentUser={owner} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Workshop temperature" })).toBeInTheDocument();
      expect(screen.getByText("Workshop temperature needs attention.")).toBeInTheDocument();
      expect(screen.getByText("Unread")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send local test" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => {
      expect(screen.getByText("Notification marked read.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Mark read" })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(screen.getByText("Notification dismissed from your inbox.")).toBeInTheDocument();
      expect(screen.getByText("No notifications match the current filters.")).toBeInTheDocument();
    });
  });

  test("owner can create an in-app test notification", async () => {
    render(<NotificationsView currentUser={owner} />);
    await screen.findByRole("button", { name: "Send local test" });
    fireEvent.click(screen.getByRole("button", { name: "Send local test" }));
    await waitFor(() => {
      expect(screen.getByText("Local test notification created.")).toBeInTheDocument();
    });
  });
});
