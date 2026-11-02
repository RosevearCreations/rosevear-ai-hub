import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { SixAppReadinessPanel } from "./SixAppReadinessPanel";
import { assessSixAppReadiness, integrationEvidenceGates, originalIntegrationGaps, sixAppContracts } from "./sixAppIntegrationReadiness";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Build 227 six-app offline contract and readiness", () => {
  it("rejects forged source, witness and owner permission claims for all six apps", () => {
    const forged = assessSixAppReadiness({
      signed_proof_b_verified: true, pin_verified: true, independent_witness_accepted: true,
      owner_test_authorized: true, private_relay_installed: true, gateway_test_authorized: true,
      authenticated_gateway_gets: 9, apps: sixAppContracts.map(app => ({ id: app.id, ready: true })),
    });
    expect(forged.apps).toHaveLength(6);
    expect(forged.independently_ready_apps).toBe(0);
    expect(forged.gateway_test_authorized).toBe(false);
    expect(forged.authenticated_gateway_gets).toBe(0);
    expect(forged.private_relay_installed).toBe(false);
    expect(forged.signed_proof_b_verified).toBe(false);
    expect(forged.ql275).toBe("UNDER_REVIEW_DEFERRED");
    for (const app of forged.apps) {
      expect(app.overall).toBe("DISCONNECTED / HOLD");
      expect(app.gates).toHaveLength(6);
      expect(app.gates.every(gate => gate.state === "NOT_INDEPENDENTLY_VERIFIED")).toBe(true);
      expect(app.owner_test_authorized).toBe(false);
      expect(app.authenticated_gateway_gets).toBe(0);
    }
    expect(originalIntegrationGaps).toHaveLength(6);
    expect(integrationEvidenceGates).toHaveLength(6);
  });

  it("shows six app contracts, filters locally and makes no network calls", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<SixAppReadinessPanel />);
    expect(screen.getByRole("heading", { name: "Six-app integration contract & readiness" })).toBeInTheDocument();
    expect(screen.getByLabelText("Six-app contract matrix").querySelectorAll("article")).toHaveLength(6);
    expect(screen.getByLabelText("Six-app readiness summary")).toHaveTextContent("Independently ready0");
    expect(screen.getByLabelText("Six-app readiness summary")).toHaveTextContent("Authenticated gateway GETs0");
    expect(screen.getByText(/QL-275:/)).toHaveTextContent("Under Review / Deferred");
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Review application"), { target: { value: "rosie_dazzlers" } });
    const matrix = screen.getByLabelText("Six-app contract matrix");
    expect(within(matrix).getByRole("article", { name: "Rosie Dazzlers integration contract" })).toBeInTheDocument();
    expect(matrix.querySelectorAll("article")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Evidence topic"), { target: { value: "owner" } });
    expect(screen.getByText(/Separate owner authorization: NOT INDEPENDENTLY VERIFIED/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
