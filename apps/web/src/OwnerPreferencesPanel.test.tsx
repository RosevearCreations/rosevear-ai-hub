import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { OwnerPreferencesPanel } from "./OwnerPreferencesPanel";
import { ownerPreferenceKey } from "./ownerPreferences";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Build 223 owner saved-view workbench", () => {
  it("saves and applies an explicit named preference without changing protected records", () => {
    const apply = vi.fn();
    render(<OwnerPreferencesPanel ownerId={7} theme="standard" density="compact" onApply={apply} />);
    fireEvent.change(screen.getByLabelText("Saved view name"), { target: { value: "Morning review" } });
    fireEvent.change(screen.getByLabelText("Start screen for this view"), { target: { value: "System" } });
    fireEvent.click(screen.getByRole("button", { name: "Save current display as named view" }));
    expect(localStorage.getItem(ownerPreferenceKey(7))).toContain("Morning review");
    fireEvent.click(screen.getByRole("button", { name: "Apply Morning review" }));
    expect(apply).toHaveBeenCalledWith({ name: "Morning review", theme: "standard", density: "compact", startSection: "System" });
    fireEvent.click(screen.getByRole("button", { name: "Reset saved display views" }));
    expect(screen.getByText(/No saved display views/)).toBeInTheDocument();
    expect(localStorage.getItem(ownerPreferenceKey(7))).not.toContain("Morning review");
    expect(screen.getByRole("status")).toHaveTextContent(/No audit, security or owner acceptance records changed/);
  });

  it("rejects malformed imports without overwriting saved views", () => {
    render(<OwnerPreferencesPanel ownerId={12} theme="standard" density="comfortable" onApply={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Saved view name"), { target: { value: "Stored" } });
    fireEvent.click(screen.getByRole("button", { name: "Save current display as named view" }));
    const saved = localStorage.getItem(ownerPreferenceKey(12));
    fireEvent.change(screen.getByLabelText(/Import display preferences JSON/), { target: { value: '{"schemaVersion":2}' } });
    fireEvent.click(screen.getByRole("button", { name: "Validate & import saved views" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Unsupported preferences schema/);
    expect(localStorage.getItem(ownerPreferenceKey(12))).toBe(saved);
  });
});
