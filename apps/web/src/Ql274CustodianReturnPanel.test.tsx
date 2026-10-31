import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql274CustodianReturnPanel } from "./Ql274CustodianReturnPanel";

afterEach(cleanup);

describe("QL-274 actual source publication and return reconciliation panel", () => {
  it("starts compact, links to immutable original and produces only bounded HOLD output", () => {
    render(<Ql274CustodianReturnPanel priorQl272={null} />);
    const details = screen.getByRole("group", { name: "QL-274 immutable original publication and public custodian return reconciliation" });
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(/QL-274 · Publication exception/));
    expect(screen.getByText(/HTTP 404/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inspect immutable original" })).toHaveAttribute("href", expect.stringContaining("29e1fbe490c020efd34d598c080a7da72c9bffd5"));
    fireEvent.change(screen.getByLabelText("Public QL-274 custodian-return claim JSON (session only)"), { target: { value: '{"private":"pin"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Screen public custodian claim & prepare HOLD report (offline)" }));
    expect(screen.getByLabelText("QL-274 return screening status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const body = screen.getByLabelText("QL-274 sanitized custodian exception disposition").textContent || "";
    expect(body).not.toContain("pin\"");
    const report = JSON.parse(body);
    expect(report.activationEligible).toBe(false);
    expect(report.authenticatedGatewayGets).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-274 memory" }));
    expect(screen.getByLabelText("QL-274 return screening status")).toHaveTextContent("NOT_RECEIVED");
    expect(screen.getByLabelText("QL-274 sanitized custodian exception disposition")).toHaveTextContent("No authentic original");
  });
});
