import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getHouseholdMasterCampaign387 } from "./api";
import { Campaign387Panel } from "./Campaign387Panel";
import {
  CAMPAIGN_STEP_IDS387,
  campaignDisposition387,
  emptyCampaignReports387,
  trustedCampaign387,
  updateCampaignReport387,
  type Campaign387,
} from "./campaign387";

vi.mock("./api", () => ({
  getHouseholdMasterCampaign387: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function source387(): Campaign387 {
  const sections = [
    "System", "Devices", "MQTT", "Workshop", "Cameras", "Groceries",
    "Automations", "System", "System", "System", "System", "Users",
    "System", "System",
  ];
  return {
    schema: "rosevear.hub.household-master-acceptance387.v1",
    sourceBuild: 387,
    status: "HOLD_NO_ORIGINAL_WINDOWS_CONTEXT",
    originalHostNameMatched: false,
    runtimeSampleAvailable: false,
    runtimeSource: "LOCAL_OS_READ_ONLY_UNSIGNED",
    osBootLocallyReportedMs: null,
    apiProcessUptimeObservedSeconds: null,
    localLanInterfacesReportedUp: null,
    localResourceWarningCodes: [],
    gateCount: 14,
    trackedModuleCount: 24,
    fieldCertifiedModuleCount: 0,
    modules: Array.from({ length: 24 }, (_, i) => ({
      id: "module-" + i,
      fieldStatus: "HOLD_INDEPENDENT_EVIDENCE_MISSING" as const,
    })),
    fieldCertifiedCount: 0,
    independentOriginalHostWitnessVerified: false,
    realHouseholdDeviceEndToEndVerified: false,
    realPrinterJobMonitored: false,
    realCameraStreamVerified: false,
    safeAutomationPhysicalExecutionVerified: false,
    sevenSourceReceiptClosureVerified: false,
    independentThreeMasterAckVerified: false,
    offMachineRestoreIndependentlyVerified: false,
    preLoginRemoteAccessIndependentlyVerified: false,
    otherMasterApplicationsModified: false,
    privateCommsReceiverActivationAuthorized: false,
    backgroundNetworkOrDeviceProbesPerformed: 0,
    windowsServicesRestarted: 0,
    externalRequestsPerformed: 0,
    productionGreenMayBeConcludedFromOwnerReports: false,
    sourceReleaseAndFieldAcceptanceIndependent: true,
    gates: CAMPAIGN_STEP_IDS387.map((id, index) => ({
      id,
      title: id,
      section: sections[index],
      operatorProcedure: "Owner must review the actual live authorized device and private source.",
      requiredIndependentEvidence: "SEPARATE_ORIGINAL_DEVICE_OR_SIGNED_RECEIPT",
      sourceVerified: false,
      fieldStatus: "HOLD_INDEPENDENT_EVIDENCE_MISSING",
      ownerReportIsSignedEvidence: false,
      unsafeActuationAuthorized: false,
    })),
  };
}

describe("Build387 source and field separation", () => {
  it("uses the same fourteen exact IDs as the Python original-host campaign", () => {
    const source = readFileSync(resolve(
      process.cwd(), "../../server/src/rosevear_ai_hub/campaign387.py",
    ), "utf8");
    expect(CAMPAIGN_STEP_IDS387).toHaveLength(14);
    for (const id of CAMPAIGN_STEP_IDS387) {
      expect(source).toContain('"' + id + '"');
    }
    expect(source).toContain("SOURCE_RECEIPT");
    expect(source).toContain("receiver QL-340C");
    expect(source).toContain("no duplicate broker");
    const css = readFileSync(resolve(process.cwd(), "src/campaign387.css"), "utf8");
    expect(css).toContain("focus-visible");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("rejects spoofed GREEN, any remote actuation or missing field gate", () => {
    const report = source387();
    expect(trustedCampaign387(report)).toBe(true);
    expect(trustedCampaign387({ ...report, fieldCertifiedCount: 1 })).toBe(false);
    expect(trustedCampaign387({ ...report, independentThreeMasterAckVerified: true })).toBe(false);
    expect(trustedCampaign387({ ...report, privateCommsReceiverActivationAuthorized: true }))
      .toBe(false);
    expect(trustedCampaign387({ ...report, backgroundNetworkOrDeviceProbesPerformed: 1 }))
      .toBe(false);
    expect(trustedCampaign387({ ...report, windowsServicesRestarted: 1 })).toBe(false);
    expect(trustedCampaign387({ ...report, gates: report.gates.slice(1) })).toBe(false);
    const copied = [...report.gates];
    copied[0] = { ...copied[0], fieldStatus: "SIGNED_PASS" as never };
    expect(trustedCampaign387({ ...report, gates: copied })).toBe(false);
  });

  it("cannot turn fourteen owner-observed reports into independent certification", () => {
    let state = emptyCampaignReports387();
    expect(campaignDisposition387(state).status).toBe("FIELD_CAMPAIGN_INCOMPLETE_HOLD");
    for (const id of CAMPAIGN_STEP_IDS387) {
      state = updateCampaignReport387(state, id, "owner_reports_observed");
    }
    const all = campaignDisposition387(state);
    expect(all.ownerReviewed).toBe(14);
    expect(all.independentFieldAccepted).toBe(0);
    expect(all.certificate).toBe("HOLD_NO_INDEPENDENT_FIELD_WITNESS");
    expect(all.status).toBe("OWNER_REPORTS_ONLY_FIELD_HOLD");
    const issue = updateCampaignReport387(state, "camera-live-stream", "owner_reports_issue");
    expect(campaignDisposition387(issue).status).toBe("OWNER_ISSUES_OPEN");
    expect(campaignDisposition387(issue).ownerReportedIssues).toBe(1);
    expect(() => updateCampaignReport387(state, "bad" as never, "owner_reports_observed"))
      .toThrow("HOLD_INVALID_FIELD_REPORT");
    expect(() => updateCampaignReport387(state, "printer-pc-job", "certified" as never))
      .toThrow("HOLD_INVALID_FIELD_REPORT");
  });

  it("renders a real gated owner campaign and navigation without executing operations", async () => {
    vi.mocked(getHouseholdMasterCampaign387).mockResolvedValue(source387());
    const navigate = vi.fn();
    render(<Campaign387Panel onNavigate={navigate} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(
      "original Windows runtime context missing",
    ));
    expect(screen.getAllByText(/0\/14/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("combobox", { name: "Our local observation" })).toHaveLength(14);
    fireEvent.click(screen.getByRole("button", { name: "Open Devices" }));
    expect(navigate).toHaveBeenCalledWith("Devices");
    const selectors = screen.getAllByRole("combobox", { name: "Our local observation" });
    fireEvent.change(selectors[0], { target: { value: "owner_reports_observed" } });
    expect(screen.getByText(/1\/14/)).toBeInTheDocument();
    expect(screen.getByText(/0\/14/).parentElement).toBeTruthy();
    expect(screen.getByText(/Field verdict: HOLD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear session-only owner reports" }));
    expect(screen.getAllByText(/0\/14/).length).toBeGreaterThan(0);
  });

  it("rejects a forged response in the UI without showing any field checks", async () => {
    vi.mocked(getHouseholdMasterCampaign387).mockResolvedValue({
      ...source387(), independentThreeMasterAckVerified: true,
    });
    render(<Campaign387Panel onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(
      "HOLD_INVALID_CAMPAIGN_SOURCE_OR_UNAUTHORIZED_SUCCESS",
    ));
    expect(screen.queryByRole("combobox", { name: "Our local observation" })).toBeNull();
    expect(screen.getByText(/No physical test has been certified/)).toBeInTheDocument();
  });
});
