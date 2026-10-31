import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql273OriginGapPanel } from "./Ql273OriginGapPanel";

afterEach(cleanup);

describe("QL-273 actual System I.T. independent origin gap panel", () => {
  it("is compact, routes to the exact real source and cannot authorize TEST", () => {
    render(<Ql273OriginGapPanel />);
    const details = screen.getByRole("group", { name: "QL-273 original proof origin and independent custody gap follow-up" });
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(/QL-273 · Original Proof-B origin/));
    expect(screen.getAllByText(/HTTP 404/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Open exact original path" })).toHaveAttribute("href", expect.stringContaining("11861c13801b395d9be7f8a661fe7ebf8bc25fd5"));
    expect(screen.getAllByRole("combobox", { name: "Private-channel follow-up status" })).toHaveLength(5);
    fireEvent.change(screen.getAllByRole("combobox", { name: "Private-channel follow-up status" })[0], { target: { value: "owner_reports_return_received" } });
    expect(screen.getByLabelText("QL-273 evidence follow-up status")).toHaveTextContent("1/5 owner-reported actions · 0/5 independently verified");
    fireEvent.click(screen.getByRole("button", { name: "Prepare sanitized gap follow-up (offline)" }));
    const report = JSON.parse(screen.getByLabelText("QL-273 sanitized original proof gap HOLD disposition").textContent || "{}");
    expect(report.evidenceGaps[0].disposition).toBe("INDEPENDENT_VERIFICATION_REQUIRED");
    expect(report.activationEligible).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-273 local notes" }));
    expect(screen.getByLabelText("QL-273 evidence follow-up status")).toHaveTextContent("0/5 owner-reported actions");
    expect(screen.getByLabelText("QL-273 sanitized original proof gap HOLD disposition")).toHaveTextContent("No follow-up report prepared");
  });
});
