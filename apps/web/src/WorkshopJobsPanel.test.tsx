import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { blankWorkshopJob, jobMaterialSummary, WorkshopJobsPanel } from "./WorkshopJobsPanel";
import type { WorkshopJob } from "./api";

const JOB: WorkshopJob = {
  ...blankWorkshopJob(), id: 4, revision: 1, title: "Sterling silver pendant",
  materials: [{ name: "Sterling silver", unit: "g", estimated: "12.500", actual: "8.125" }],
  photos: [], scope: "private_local_manual", inventory_deducted: false, equipment_control: false,
};

describe("Build 218 manual workshop jobs", () => {
  let jobs: WorkshopJob[];
  const calls: { method: string; url: string; body: unknown }[] = [];
  beforeEach(() => {
    jobs = [JOB]; calls.length = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET"; const url = String(input);
      const body = init?.body && typeof init.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : null;
      calls.push({ method, url, body });
      const ok = (json: unknown) => ({ ok: true, json: async () => json });
      if (url.includes("/api/v1/workshop/jobs?") && method === "GET") return ok(jobs);
      if (url.endsWith("/api/v1/workshop/equipment")) return ok([]);
      if (url.endsWith("/api/v1/workshop/jobs/4") && method === "PUT") {
        const changed = { ...jobs[0], ...body, id: 4, revision: 2 } as WorkshopJob;
        jobs = [changed]; return ok(changed);
      }
      return { ok: false, status: 404, json: async () => ({ detail: "Missing" }) };
    }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  test("read-only viewer sees private manual progress without mutation controls", async () => {
    render(<WorkshopJobsPanel role="read_only" />);
    expect(await screen.findByText("Sterling silver pendant")).toBeInTheDocument();
    expect(screen.getByText(/8.125\/12.500 g/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review job 4" }));
    expect(screen.getByRole("region", { name: "Selected workshop job" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Save job revision/ })).not.toBeInTheDocument();
    expect(calls.every((call) => call.method === "GET")).toBe(true);
  });

  test("owner edits actual material quantities with unit retained and revision lease", async () => {
    render(<WorkshopJobsPanel role="owner" />);
    await screen.findByText("Sterling silver pendant");
    fireEvent.click(screen.getByRole("button", { name: "Review job 4" }));
    fireEvent.change(screen.getByLabelText("Actual quantity"), { target: { value: "9.500" } });
    fireEvent.click(screen.getByRole("button", { name: "Save job revision 1" }));
    await waitFor(() => expect(calls.some((call) => call.method === "PUT")).toBe(true));
    const saved = calls.find((call) => call.method === "PUT")?.body as Record<string, unknown>;
    expect(saved.expected_revision).toBe(1);
    expect(saved.materials).toEqual([{ name: "Sterling silver", unit: "g", estimated: "12.500", actual: "9.500" }]);
    expect(calls.every((call) => !call.url.includes("/control"))).toBe(true);
  });

  test("material summary explicitly displays actual versus estimate and unit", () => {
    expect(jobMaterialSummary(JOB)).toBe("Sterling silver: 8.125/12.500 g");
    expect(jobMaterialSummary({ ...JOB, materials: [] })).toBe("No materials recorded");
  });
});
