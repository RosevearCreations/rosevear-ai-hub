import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql271ProofReturnPanel } from "./Ql271ProofReturnPanel";

afterEach(cleanup);

describe("Build 196 manual public-review return UI", () => {
  it("starts HELD, scrubs invalid payload, and never offers activation controls", () => {
    render(<Ql271ProofReturnPanel priorQl270={null} />);
    expect(screen.getByText(/the required original proof file returned HTTP 404/i)).toBeInTheDocument();
    const input = screen.getByLabelText("Sanitized public review return JSON (temporary browser memory)");
    fireEvent.change(input, { target: { value: '{"private":"secret"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Screen public original-return claim (offline)" }));
    expect(input).toHaveValue("");
    expect(screen.getByLabelText("QL-271 public reviewer intake status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const report = screen.getByLabelText("QL-271 sanitized reviewer HOLD disposition").textContent ?? "";
    expect(report).toContain('"activationEligible": false');
    expect(report).not.toContain("secret");
    expect(report).toContain('"integration": "DISCONNECTED / HOLD"');
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-271 memory" }));
    expect(screen.getByLabelText("QL-271 public reviewer intake status")).toHaveTextContent("NOT_RECEIVED");
  });
});
