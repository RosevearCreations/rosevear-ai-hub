import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HomeOperationsRoomsPanel } from "./HomeOperationsRoomsPanel";
import { fixture, policy } from "./homeOperationsRoomsModel.test";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 216 owner room review", () => {
  test("shows unavailable source without fabricated zero counts and denies controls", () => {
    render(<HomeOperationsRoomsPanel browser={null} policy={null} role="read_only" />);
    expect(screen.getByRole("status")).toHaveTextContent("unknown, not zero");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  test("only fresh allowlisted candidates can enter a removable planning draft; no API calls", () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const freshFixture = { ...fixture, entities: fixture.entities.map(entity => entity.entity_id === "light.hall"
      ? { ...entity, last_updated: new Date().toISOString() } : entity) };
    render(<HomeOperationsRoomsPanel browser={freshFixture} policy={policy} role="owner" />);
    const fresh = screen.getByRole("button", { name: "Include Hall lamp in planning-only draft" });
    expect(fresh).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Include Kiln in planning-only draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Include Unknown lamp in planning-only draft" })).toBeDisabled();
    fireEvent.click(fresh);
    expect(screen.getByRole("region", { name: "Owner scene approval boundary" })).toHaveTextContent("1/4 safe candidates");
    fireEvent.click(screen.getByRole("button", { name: "Clear draft and safe-stop" }));
    expect(screen.getByRole("region", { name: "Owner scene approval boundary" })).toHaveTextContent("0/4 safe candidates");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
