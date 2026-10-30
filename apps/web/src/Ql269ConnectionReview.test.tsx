import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql269ConnectionReview } from "./Ql269ConnectionReview";

afterEach(cleanup);

describe("Build 194 original public readback source panel", () => {
  it("rejects secrets and clears the input; all gateway gates stay held", () => {
    render(<Ql269ConnectionReview priorQl268={null} />);
    expect(screen.queryByRole("button", { name: /activate|connect now|run gateway get/i })).toBeNull();
    const input = screen.getByRole("textbox", { name: /QL-269 public original-proof readback metadata/ });
    fireEvent.change(input, { target: { value: '{"private_key":"EXPOSE_ME"}' } });
    fireEvent.click(screen.getByRole("button", { name: /Compare original-proof readback/ }));
    expect(input).toHaveValue("");
    expect(screen.getByLabelText("QL-269 readback intake status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const report = JSON.parse(screen.getByLabelText("QL-269 sanitized independent GET preflight report").textContent || "{}");
    expect(report.activationEligible).toBe(false);
    expect(report.authenticatedGatewayGets).toBe(0);
    expect(report.scheduledGetSlot).toBe("HELD_UNSCHEDULED");
    expect(JSON.stringify(report)).not.toContain("EXPOSE_ME");
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-269 memory" }));
    expect(screen.getByLabelText("QL-269 readback intake status")).toHaveTextContent("NOT_RECEIVED");
  });
});
