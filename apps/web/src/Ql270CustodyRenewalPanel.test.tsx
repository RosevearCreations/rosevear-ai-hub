import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql270CustodyRenewalPanel } from "./Ql270CustodyRenewalPanel";

afterEach(cleanup);

describe("Build 195 QL-270 original source recheck panel", () => {
  it("fails closed, clears unsafe private input and offers no connect action", () => {
    render(<Ql270CustodyRenewalPanel priorQl269={null} />);
    expect(screen.queryByRole("button", { name: /connect now|activate pilot|run gateway GET/i })).toBeNull();
    const field = screen.getByRole("textbox", { name: /Sanitized public custody\/pin renewal metadata/ });
    fireEvent.change(field, { target: { value: '{"secret":"NEVER_EXPORT"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Screen public renewal/ }));
    expect(field).toHaveValue("");
    expect(screen.getByLabelText("QL-270 renewal intake status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const report = JSON.parse(screen.getByLabelText("QL-270 sanitized custody and source HOLD report").textContent || "{}");
    expect(report.originalProofAtObservedMain).toBe("HTTP_404");
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.activationEligible).toBe(false);
    expect(JSON.stringify(report)).not.toContain("NEVER_EXPORT");
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-270 memory" }));
    expect(screen.getByLabelText("QL-270 renewal intake status")).toHaveTextContent("NOT_RECEIVED");
  });
});
