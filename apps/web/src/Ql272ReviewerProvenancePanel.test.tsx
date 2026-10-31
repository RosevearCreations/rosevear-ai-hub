import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql272ReviewerProvenancePanel } from "./Ql272ReviewerProvenancePanel";

afterEach(cleanup);

describe("QL-272 real I.T. provenance disclosure", () => {
  it("starts collapsed with original proof HTTP 404; rejects and scrubs untrusted input", () => {
    render(<Ql272ReviewerProvenancePanel priorQl271={null} />);
    const details = screen.getByRole("group", { name: "QL-272 reviewer evidence provenance and source recheck" });
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(/QL-272 · Independent publication recheck/));
    expect(details).toHaveAttribute("open");
    const input = screen.getByLabelText("Public provenance claim JSON (temporary memory only)");
    fireEvent.change(input, { target: { value: '{"privateKey":"do not persist"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Screen public provenance & prepare HOLD disposition (offline)" }));
    expect(input).toHaveValue("");
    expect(screen.getByLabelText("QL-272 provenance intake status")).toHaveTextContent("REJECTED_UNTRUSTED_OR_MALFORMED");
    const report = screen.getByLabelText("QL-272 sanitized provenance exception disposition").textContent || "";
    expect(report).not.toContain("do not persist");
    expect(report).toContain('"activationEligible": false');
    fireEvent.click(screen.getByRole("button", { name: "Clear QL-272 memory" }));
    expect(screen.getByLabelText("QL-272 provenance intake status")).toHaveTextContent("NOT_RECEIVED");
  });
});
