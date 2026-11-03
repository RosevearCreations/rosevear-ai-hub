import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WindowsAppearanceAcceptance236Panel } from "./WindowsAppearanceAcceptance236Panel";
import {
  appearance236Cases, appearance236FollowupKey, appearance236ObservationKey,
  defaultAppearance236Entry, formatAppearance236Packet, summarizeAppearance236,
  type Appearance236Entry, type Appearance236Id,
} from "./windowsAppearanceAcceptance236";

const scope = { installedVersion: "hub-236-windows", ownerWitnessed: true };
const observedTime = "2026-11-03T11:00:00Z";
const laterTime = "2026-11-03T11:30:00Z";

function observed(id: Appearance236Id, outcome: "pass" | "finding" | "blocked" = "pass",
  symptom: Appearance236Entry["symptom"] = "none", viewport: Appearance236Entry["viewport"] = "windows_desktop") {
  const entry = { ...defaultAppearance236Entry, outcome, symptom, viewport,
    reference: `WIN-236-${id.toUpperCase()}`, observedAt: observedTime };
  return { ...entry, observedKey: appearance236ObservationKey(id, "dark", scope, entry) };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 236 installed Windows Dark Mode and navigation owner review", () => {
  it("starts with zero owner passes, independent acceptance, repairs and outside authentication", () => {
    const summary = summarizeAppearance236("dark", { installedVersion: "", ownerWitnessed: false }, {});
    expect(summary).toMatchObject({ ownerPasses: 0, openFindings: 0, followupsRecorded: 0,
      verifiedWindowsAcceptance: 0, authenticatedOutsideReviews: 0,
      repairsAuthorized: 0, repairsExecuted: 0, privateRelay: "OFF" });
    expect(summary.rows).toHaveLength(appearance236Cases.length);
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsAppearanceAcceptance236Panel theme="dark" onNavigate={vi.fn()} />);
    expect(screen.getByLabelText("Build 236 Windows appearance acceptance totals")).toHaveTextContent("Owner-reported passes0/7");
    expect(screen.queryByLabelText("Build 236 installed Windows visual review cases")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not count source CI, missing Windows witness, inactive Dark Mode or stale evidence as a pass", () => {
    const entry = observed("signin");
    expect(summarizeAppearance236("dark", { ...scope, ownerWitnessed: false }, { signin: entry }).rows[0].gate).toBe("scope_gap");
    expect(summarizeAppearance236("standard", scope, { signin: entry }).rows[0].gate).toBe("dark_inactive");
    expect(summarizeAppearance236("dark", { ...scope, installedVersion: "different" }, { signin: entry }).rows[0].gate).toBe("observation_stale");
    expect(summarizeAppearance236("dark", scope, { signin: { ...entry, reference: "" } }).rows[0].gate).toBe("evidence_gap");
    expect(summarizeAppearance236("dark", scope, { signin: { ...entry, observedAt: "" } }).rows[0].gate).toBe("observation_stale");
    expect(summarizeAppearance236("dark", scope, { signin: entry }).ownerPasses).toBe(1);
  });

  it("rejects reused evidence and desktop-only claims for narrow-view acceptance", () => {
    const first = observed("signin");
    const duplicate = { ...observed("signout"), reference: first.reference };
    const summary = summarizeAppearance236("dark", scope, { signin: first, signout: duplicate });
    expect(summary.ownerPasses).toBe(0);
    expect(summary.rows[0].gate).toBe("duplicate_reference");
    expect(summary.rows[1].gate).toBe("duplicate_reference");
    expect(summarizeAppearance236("dark", scope, { narrow: observed("narrow") }).rows.find(row => row.id === "narrow")?.gate).toBe("viewport_gap");
    expect(summarizeAppearance236("dark", scope, { narrow: observed("narrow", "pass", "none", "narrow_window") }).ownerPasses).toBe(1);
  });

  it("keeps owner-observed findings open and only permits a separate review request without repair grants", () => {
    const finding = observed("contrast", "finding", "contrast");
    const pending = summarizeAppearance236("dark", scope, { contrast: finding });
    expect(pending.rows.find(row => row.id === "contrast")?.gate).toBe("open_finding");
    const followupBase = { ...finding, followup: "request_review" as const,
      followupReference: "WIN-236-CONTRAST-REVIEW", followupAttested: true,
      followupAt: laterTime };
    const reviewed = { ...followupBase, followupKey: appearance236FollowupKey(followupBase) };
    const ready = summarizeAppearance236("dark", scope, { contrast: reviewed });
    expect(ready).toMatchObject({ openFindings: 1, followupsRecorded: 1,
      repairsAuthorized: 0, repairsExecuted: 0, verifiedWindowsAcceptance: 0 });
    expect(ready.rows.find(row => row.id === "contrast")?.gate).toBe("review_requested");
    expect(summarizeAppearance236("dark", scope, { contrast: { ...reviewed, followupReference: finding.reference } })
      .rows.find(row => row.id === "contrast")?.gate).toBe("followup_gap");
    expect(summarizeAppearance236("dark", scope, { contrast: { ...reviewed, followupAt: observedTime } })
      .rows.find(row => row.id === "contrast")?.gate).toBe("followup_stale");
    expect(summarizeAppearance236("dark", scope, { contrast: { ...reviewed, symptom: "glare" } })
      .rows.find(row => row.id === "contrast")?.gate).toBe("observation_stale");
    const packet = formatAppearance236Packet("dark", scope, { contrast: reviewed });
    expect(packet).toContain("NOT INDEPENDENTLY VERIFIED / NO REPAIR AUTHORIZATION");
    expect(packet).toContain("repairs authorized/executed: 0/0");
    expect(packet).toContain("DISCONNECTED / HOLD");
  });

  it("records an authentic owner-reported pass locally, invalidates changed versions and navigates without probes", () => {
    vi.stubGlobal("fetch", vi.fn());
    const onNavigate = vi.fn();
    render(<WindowsAppearanceAcceptance236Panel theme="dark" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Build 236 Windows visual acceptance worksheet" }));
    const first = screen.getByLabelText("Build 236 installed Windows visual review cases").querySelector("article")!;
    expect(first.querySelector("button[disabled]")!).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Exact owner-observed installed Windows Hub version/), { target: { value: scope.installedVersion } });
    fireEvent.click(screen.getByLabelText(/We personally observed this installed Windows Hub/));
    fireEvent.change(first.querySelector("select#windows-236-outcome-signin")!, { target: { value: "pass" } });
    fireEvent.change(first.querySelector("select#windows-236-viewport-signin")!, { target: { value: "windows_desktop" } });
    fireEvent.change(first.querySelector("input#windows-236-ref-signin")!, { target: { value: "WIN-236-SIGNIN" } });
    fireEvent.click(first.querySelectorAll("button")[1]);
    expect(screen.getByLabelText("Build 236 Windows appearance acceptance totals")).toHaveTextContent("Owner-reported passes1/7");
    fireEvent.click(first.querySelectorAll("button")[0]);
    expect(onNavigate).toHaveBeenCalledWith("Home");
    fireEvent.change(screen.getByLabelText(/Exact owner-observed installed Windows Hub version/), { target: { value: "changed-install" } });
    expect(screen.getByLabelText("Build 236 Windows appearance acceptance totals")).toHaveTextContent("Owner-reported passes0/7");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("records a separately acknowledged retest request without closing or repairing a finding", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsAppearanceAcceptance236Panel theme="dark" onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Build 236 Windows visual acceptance worksheet" }));
    fireEvent.change(screen.getByLabelText(/Exact owner-observed installed Windows Hub version/), { target: { value: scope.installedVersion } });
    fireEvent.click(screen.getByLabelText(/We personally observed this installed Windows Hub/));
    const first = screen.getByLabelText("Build 236 installed Windows visual review cases").querySelector("article")!;
    fireEvent.change(first.querySelector("select#windows-236-outcome-signin")!, { target: { value: "finding" } });
    fireEvent.change(first.querySelector("select#windows-236-viewport-signin")!, { target: { value: "windows_desktop" } });
    fireEvent.change(first.querySelector("input#windows-236-ref-signin")!, { target: { value: "WIN-236-SIGNIN" } });
    fireEvent.change(first.querySelector("select#windows-236-symptom-signin")!, { target: { value: "glare" } });
    fireEvent.click(first.querySelectorAll("button")[1]);
    fireEvent.change(first.querySelector("select#windows-236-decision-signin")!, { target: { value: "request_retest" } });
    fireEvent.change(first.querySelector("input#windows-236-followup-ref-signin")!, { target: { value: "WIN-236-RETEST-SIGNIN" } });
    fireEvent.click(first.querySelector(".windows-appearance-236-followup input[type=checkbox]")!);
    fireEvent.click(first.querySelector(".windows-appearance-236-followup button")!);
    expect(screen.getByLabelText("Build 236 Windows appearance acceptance totals")).toHaveTextContent("Separate follow-ups1");
    expect(screen.getByLabelText("Build 236 Windows appearance acceptance totals")).toHaveTextContent("Verified Windows acceptance / repairs0 / 0");
    expect(fetch).not.toHaveBeenCalled();
  });
});
