import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Ql256CustodyIntakePanel } from "./Ql256CustodyIntakePanel";

afterEach(cleanup);

describe("Build 184 QL-256 private custody candidate panel", () => {
  it("starts fail closed, no real witness or proof and no usable record action", () => {
    render(<Ql256CustodyIntakePanel />);
    expect(screen.getByText(/TRUST NOT VERIFIED/)).toBeTruthy();
    expect(screen.getByText(/Owner TEST: NOT GIVEN/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Record nonsecret/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Download sanitized/ })).toBeDisabled();
  });
  it("keeps manual candidate untrusted, and rejects recording until two explicit acknowledgements", () => {
    render(<Ql256CustodyIntakePanel />);
    const checks = screen.getAllByRole("checkbox");
    fireEvent.click(checks[0]);
    expect(screen.getByRole("button", { name: /Record nonsecret/ })).toBeDisabled();
    fireEvent.click(checks[1]);
    fireEvent.click(screen.getByRole("button", { name: /Record nonsecret/ }));
    expect(screen.getByText(/1 local candidate/)).toBeTruthy();
    expect(screen.getByText(/no real custodian\/witness/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Download sanitized/ })).not.toBeDisabled();
  });
});
