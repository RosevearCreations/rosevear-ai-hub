import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WindowsFieldAcceptance228Panel } from "./WindowsFieldAcceptance228Panel";
import {
  formatWindowsFieldHandoff, normalizeWindowsObservation, safeWindowsFieldReference, summarizeWindowsFieldReview,
  windowsFieldCases, windowsFieldRoadmap,
} from "./windowsFieldAcceptance228";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 228 owner Windows acceptance and regression matrix", () => {
  it("starts with all installed checks unverified and never fetches or actuates", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Windows field acceptance & regression matrix" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Build 228 Windows regression matrix" }).querySelectorAll("tbody tr")).toHaveLength(windowsFieldCases.length);
    expect(screen.getByLabelText("Windows field acceptance totals")).toHaveTextContent(`Owner-reported passes0/${windowsFieldCases.length}`);
    expect(screen.getByText(/actual Windows evidence and owner sign-off remain outstanding/)).toBeInTheDocument();
    expect(screen.getByText(/six-app integration DISCONNECTED \/ HOLD/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not promote a checkbox pass without installed version, witness and evidence", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Result for Dependency-ordered Windows startup"), { target: { value: "pass" } });
    expect(screen.getByLabelText("Windows field acceptance totals")).toHaveTextContent("Owner-reported passes0/11");
    expect(screen.getByText("Pass needs on-device evidence")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Installed Windows Hub version/), { target: { value: "locally-observed-228" } });
    fireEvent.click(screen.getByLabelText(/I am observing the installed Windows Hub/));
    fireEvent.change(screen.getByLabelText("Evidence source for Dependency-ordered Windows startup"), { target: { value: "local_log" } });
    fireEvent.change(screen.getByLabelText(/Reference for Dependency-ordered Windows startup/), { target: { value: "WIN-228-START" } });
    expect(screen.getByLabelText("Windows field acceptance totals")).toHaveTextContent("Owner-reported passes1/11");
    fireEvent.click(screen.getByLabelText(/I am observing the installed Windows Hub/));
    expect(screen.getByLabelText("Windows field acceptance totals")).toHaveTextContent("Owner-reported passes0/11");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps findings in the evidence-based roadmap and navigates without probes", () => {
    const onNavigate = vi.fn();
    vi.stubGlobal("fetch", vi.fn());
    render(<WindowsFieldAcceptance228Panel onNavigate={onNavigate} />);
    fireEvent.change(screen.getByLabelText("Result for Home Assistant inventory reconciliation"), { target: { value: "blocked" } });
    fireEvent.change(screen.getByLabelText("Filter regression matrix"), { target: { value: "attention" } });
    expect(screen.getByLabelText("Evidence-based next roadmap")).toHaveTextContent("Home Assistant inventory reconciliation");
    const row = screen.getByLabelText("Result for Home Assistant inventory reconciliation").closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row!.querySelector("button")!);
    expect(onNavigate).toHaveBeenCalledWith("Devices");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects fabricated and malformed evidence and never upgrades safety gates", () => {
    expect(safeWindowsFieldReference("https://host/path?key=secret@example.com")).toBe("httpshostpathkeysecretexamplecom");
    const malformed = normalizeWindowsObservation({ outcome: "independently_verified", basis: "fake", reference: 99, recordedAt: "yesterday" });
    expect(malformed).toEqual({ outcome: "not_tested", basis: "none", reference: "", recordedAt: "" });
    const draft = { startup: { outcome: "pass" as const, basis: "local_log" as const, reference: "WIN-228-START", recordedAt: "2026-11-02T17:00:00Z" } };
    const scope = { installedVersion: "2026-11-02-main", physicallyWitnessed: true };
    const summary = summarizeWindowsFieldReview(draft, scope);
    expect(summary.ownerReportedPasses).toBe(1);
    expect(summary.independentlyVerified).toBe(false);
    expect(summary.sourceCiGreen).toBe("NOT_ASSESSED_HERE");
    expect(summary.privateRelay).toBe("OFF");
    expect(summary.sixAppIntegration).toBe("DISCONNECTED / HOLD");
    expect(summary.ql275).toBe("UNDER_REVIEW_DEFERRED");
    expect(summary.vault).toBe("SECURITY_HOLD");
    expect(windowsFieldRoadmap(draft, scope)).toHaveLength(1);
    const report = formatWindowsFieldHandoff(draft, scope);
    expect(report).toContain("OWNER REPORTED ONLY");
    expect(report).toContain("Six-app integration: DISCONNECTED / HOLD");
  });
});
