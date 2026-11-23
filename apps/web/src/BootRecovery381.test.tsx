import {afterEach, expect, it, vi} from "vitest";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";

import {BootRecovery381, parseBootProbe381} from "./BootRecovery381";
import type {BootClassification381, BootProbe381} from "./api";

const report: BootProbe381 = {
  schema: "rosevear.hub.boot-sequence381.report.v1",
  phase: "after", captured_at_utc: "2026-11-23T15:00:00Z",
  os_boot_at_utc: "2026-11-23T14:00:00Z",
  original_host_name_matched: true, source: "UNSIGNED_LOCAL_WINDOWS_READ_ONLY",
  checks: {
    vm: "healthy", mqtt: "unverified", tailscale: "healthy",
    ollama: "healthy", api: "healthy", web: "healthy", go2rtc: "healthy",
    gateway: "healthy", ip_reservation: "unverified",
    private_https: "unverified", off_device: "unverified",
  },
  tasks: {
    boot: "enabled", recovery: "enabled",
    boot_last_run_after_os_boot: true,
    recovery_last_run_after_os_boot: true,
    task_identity_independently_verified: false,
  },
  reboot_independently_verified: false, external_witness_verified: false,
  operations_performed: false,
};

const classification: BootClassification381 = {
  schema: "rosevear.hub.boot-sequence381.classification.v1",
  source: "OWNER_IMPORTED_UNSIGNED_LOCAL_READ_ONLY",
  phase: "after", capturedAtUtc: report.captured_at_utc,
  osBootAtUtc: report.os_boot_at_utc,
  newBootTimeObserved: false, taskStates: report.tasks,
  stages: [{
    id: "mqtt", label: "Home Assistant MQTT add-on", dependsOn: ["vm"],
    blockedBy: [], reportedObservation: "unverified", state: "UNVERIFIED",
    safeManualAction: "Check authenticated guest add-on separately.",
    source: "OWNER_IMPORTED_UNSIGNED_LOCAL_OBSERVATION",
  }],
  blockedStages: ["mqtt"], holdReasons: ["REMOTE_PRELOGIN_TLS_AND_ROUTER_WITNESS_NOT_IN_LOCAL_REPORT"],
  fieldAcceptance: "HOLD",
  independentRemoteWitness: false, taskIdentityVerified: false,
  unattendedRecoveryCertified: false, productionOriginalHostGreen: false,
  automaticRestarts: 0, networkChanges: 0, routerChanges: 0,
  firewallChanges: 0, secretValuesRead: 0,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("Build381 blocks spoofed action/evidence and wrong phases locally", () => {
  expect(() => parseBootProbe381(JSON.stringify(report), "before")).toThrow("Unsupported source");
  expect(() => parseBootProbe381(JSON.stringify({
    ...report, operations_performed: true,
  }), "after")).toThrow("Unsupported source");
  expect(() => parseBootProbe381(JSON.stringify({
    ...report, external_witness_verified: true,
  }), "after")).toThrow("Unsupported source");
  expect(() => parseBootProbe381("not JSON", "after")).toThrow("complete JSON");
  expect(parseBootProbe381(JSON.stringify(report), "after").source)
    .toBe("UNSIGNED_LOCAL_WINDOWS_READ_ONLY");
});

it("Build381 imports manual observations only on click; always shows field HOLD", async () => {
  const requests: Array<{url:string; method:string; body:string}> = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method ?? "GET";
    requests.push({url,method,body:String(init?.body ?? "")});
    return {
      ok: true,
      json: async () => url.endsWith("/contract")
        ? {
          schema: "rosevear.hub.boot-sequence381.contract.v1",
          stages: [{id:"vm",label:"Pinned Home Assistant VM",dependsOn:[],
            safeManualAction:"Inspect existing VM"}],
          fieldAcceptance:"HOLD",
        }
        : classification,
    };
  }));
  render(<BootRecovery381 />);
  expect(await screen.findByText(/Inspect existing VM/)).toBeInTheDocument();
  expect(requests.every(x => x.method === "GET")).toBe(true);
  const button = screen.getByRole("button", {name:"Compare boot dependencies"});
  expect(button).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", {name:/After-reboot report/}), {
    target: {value:JSON.stringify(report)},
  });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(await screen.findByRole("heading", {name:"Dependency recovery findings"}))
    .toBeInTheDocument();
  expect(screen.getByText(/Reboot independently certified:/)).toBeInTheDocument();
  expect(screen.getByText(/REMOTE PRELOGIN TLS AND ROUTER WITNESS/i)).toBeInTheDocument();
  const posts = requests.filter(x => x.method === "POST");
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toContain("/api/v1/system/boot-sequence-381/classify");
  expect(JSON.parse(posts[0].body).before).toBeNull();
  expect(JSON.parse(posts[0].body).after.operations_performed).toBe(false);
  await waitFor(() => expect(button).toBeEnabled());
  expect(requests.every(x => !/restart|execute|control|firewall/i.test(x.url))).toBe(true);
});
