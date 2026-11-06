import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessEvidence256Panel } from "./ProcessEvidence256Panel";

describe("Build 256 local signed process review UI", () => {
  it("starts with disabled verification and TEST disconnected even with a release signer", () => {
    const {container} = render(<ProcessEvidence256Panel expectedSha={"a".repeat(40)} originalSignerKey={"b".repeat(44)} />);
    expect(screen.getByRole("region", {name: /Build 256 Windows signed process evidence intake/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify signed process candidate locally/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("DISCONNECTED / HOLD");
    expect(container.textContent).toContain("NOT ATTESTED");
    expect(container.textContent).toContain("COMMS TEST RECEIVER HOLD");
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(0);
  });
});
