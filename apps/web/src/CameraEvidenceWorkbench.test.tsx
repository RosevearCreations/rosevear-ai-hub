import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CameraEventTimeline } from "./CameraEventTimeline";
import type { CameraEventReview, FrigateEvent } from "./api";

const now = Date.now() / 1000;
const event: FrigateEvent = {
  event_id: "event-1", camera: "front_door", label: "person", sub_label: null,
  start_time: now - 90, end_time: now - 80, zones: ["front"], has_clip: true,
  has_snapshot: true, false_positive: false, score: .92,
};
const older: CameraEventReview = {
  event_id: "event-old", camera_name: "garage", object_label: "vehicle",
  event_start_time: now - 86400 * 40, review_status: "flagged", note: "Old case",
  reviewed_by_user_id: 1, updated_at: new Date().toISOString(),
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 142 evidence workbench", () => {
  test("merges deduplicated live records with local notes and requires explicit owner acknowledgement", async () => {
    let writes = 0;
    vi.stubGlobal("fetch", vi.fn(async (request: RequestInfo | URL, options?: RequestInit) => {
      const url = String(request);
      if (url.includes("/api/v1/frigate/reviews?")) return { ok: true, json: async () => [older] };
      if (url.endsWith("/api/v1/frigate/events/event-1/review")) {
        writes++;
        const body = JSON.parse(String(options?.body));
        expect(body).toEqual({ review_status: "follow_up", note: "" });
        return { ok: true, json: async () => ({
          event_id: "event-1", camera_name: event.camera, object_label: event.label,
          event_start_time: event.start_time, review_status: "follow_up", note: "",
          reviewed_by_user_id: 1, updated_at: new Date().toISOString(),
        }) };
      }
      throw new Error(`Unexpected request ${url}`);
    }));
    render(<CameraEventTimeline events={[event, event]} online canAdminister observedAt={new Date().toISOString()} />);
    await screen.findByText(/Saved local note: Old case/);
    expect(screen.getByText(/1 duplicate source row/)).toBeInTheDocument();
    expect(screen.getByText("Hub local review only")).toBeInTheDocument();
    expect(screen.getAllByText("On hold — no authenticated Hub media endpoint")).toHaveLength(2);
    expect(document.querySelectorAll("iframe, video, img")).toHaveLength(0);
    const action = screen.getByRole("button", { name: "Acknowledge for follow-up" });
    fireEvent.click(action);
    await waitFor(() => expect(writes).toBe(1));
    expect(await screen.findByRole("button", { name: "Acknowledged for follow-up" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Filter evidence by source"), { target: { value: "hub_review_only" } });
    expect(screen.getByText(/Saved local note: Old case/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledged for follow-up" })).not.toBeInTheDocument();
  });

  test("read-only account never loads private review ledger or acknowledgement controls", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    render(<CameraEventTimeline events={[event]} online canAdminister={false} observedAt={new Date().toISOString()} />);
    expect(screen.getByText("Frigate recent sample")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge for follow-up" })).not.toBeInTheDocument();
    expect(screen.queryByText("Old case")).not.toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("stale source holds follow-up, date-range error and reset are recoverable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
    render(<CameraEventTimeline events={[event]} online canAdminister observedAt={new Date(Date.now() - 600000).toISOString()} />);
    expect(screen.getByText(/stale\/unverified/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge for follow-up" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From event date"), { target: { value: "2026-10-26" } });
    fireEvent.change(screen.getByLabelText("Through event date"), { target: { value: "2026-10-25" } });
    expect(screen.getByRole("alert", { name: "" })).toHaveTextContent(/Invalid date range/);
    fireEvent.click(screen.getByRole("button", { name: "Clear evidence filters" }));
    expect(screen.queryByText(/Invalid date range/)).not.toBeInTheDocument();
  });
});
