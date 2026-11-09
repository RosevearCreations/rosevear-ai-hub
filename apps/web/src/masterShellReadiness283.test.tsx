import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { MasterShellReadinessPanel283 } from "./MasterShellReadinessPanel283";
import { buildMasterShellCandidateReport, hubModuleEstimates, masterShellOpenDecisions, masterShellRoutingAssessment } from "./masterShellReadiness283";

afterEach(cleanup);

describe("Build 283 Master Shell readiness candidate", () => {
  it("keeps the app identity and local support scope distinct from shared authority", () => {
    const report = buildMasterShellCandidateReport();
    expect(report.appId).toBe("rosevear-ai-hub");
    expect(report.shellRole).toBe("local_support");
    expect(report.tenantBoundary).toBe("no_customer_tenant");
    expect(report.status).toBe("OWNER_REVIEW_ONLY_NOT_SENT");
    expect(report.transport).toBe("NO_REPORT_PUBLISHER_OR_RECEIVER_ACTIVATED");
    expect(report.verifiedDeployedCompletion).toBeNull();
  });

  it("does not misrepresent non-Hub business functions as zero-percent modules", () => {
    const report = buildMasterShellCandidateReport();
    expect(report.sections.length).toBe(hubModuleEstimates.length);
    expect(new Set(report.sections.map(section => section.id)).size).toBe(report.sections.length);
    for (const section of report.sections) {
      expect(section.label.length).toBeGreaterThan(0);
      expect(section.evidence.length).toBeGreaterThan(0);
      expect(section.outstanding.length).toBeGreaterThan(0);
      if (section.estimatedPercent === null) expect(section.evidenceState).toBe("NOT_APPLICABLE");
      else {
        expect(section.estimatedPercent).toBeGreaterThanOrEqual(0);
        expect(section.estimatedPercent).toBeLessThanOrEqual(100);
        expect(section.evidenceState).toBe("SOURCE_REVIEW_NOT_FIELD_VERIFIED");
      }
    }
    expect(report.sections.find(section => section.id === "financials")?.estimatedPercent).toBeNull();
  });

  it("records all four flow shapes and joint-policy decisions without granting trust", () => {
    expect(masterShellRoutingAssessment).toHaveLength(4);
    expect(masterShellOpenDecisions.length).toBeGreaterThanOrEqual(6);
    expect(masterShellRoutingAssessment.map(route => route.state)).toEqual([
      "CONTRACT_PENDING", "EXISTING_SOURCE_CONTRACT", "POLICY_PENDING", "POLICY_PENDING",
    ]);
  });

  it("filters relevant estimates and N/A facets accessibly and previews the non-transmitted schema", () => {
    render(<MasterShellReadinessPanel283 ownerId="ree-test" />);
    expect(screen.getByText(/Owner review only — not transmitted/)).toBeInTheDocument();
    expect(screen.queryByText(/Customer experience · mobile:/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Module scope"), { target: { value: "not-applicable" } });
    expect(screen.getByText(/Customer experience · mobile: N\/A/)).toBeInTheDocument();
    expect(screen.queryByText(/Owner\/admin · desktop:/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Module scope"), { target: { value: "applicable" } });
    expect(screen.getByText(/Owner\/admin · desktop: 80% provisional/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Preview proposed report schema" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Hide proposed report schema" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Local preview only/)).toBeInTheDocument();
    expect(document.querySelector("#master-shell-candidate-preview")?.textContent).toContain("OWNER_REVIEW_ONLY_NOT_SENT");
    fireEvent.click(screen.getByRole("button", { name: "Hide proposed report schema" }));
    expect(document.querySelector("#master-shell-candidate-preview")).toBeNull();
  });

  it("shows no publish, grant or connection action in the preview", () => {
    render(<MasterShellReadinessPanel283 ownerId="ree-test" />);
    expect(screen.queryByRole("button", { name: /publish|connect|grant|approve|export|send/i })).toBeNull();
    expect(document.body.textContent).not.toContain("DISCONNECTED / HOLD");
  });
});
