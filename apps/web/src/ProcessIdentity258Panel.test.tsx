import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessIdentity258Panel } from "./ProcessIdentity258Panel";

describe("Build 258 owner Windows review remains fail closed", () => {
  it("requires externally authenticated receipts before verification or TEST", () => {
    const {container} = render(<ProcessIdentity258Panel expectedSha={"9".repeat(40)} trustedOriginalKey={null} />);
    expect(screen.getByRole("region", {name: /Build 258 Windows installed-source/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify independently signed Build 258 receipts/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("NOT ATTESTED");
    expect(container.textContent).toContain("OFF / HOLD — NOT AUTHORIZED");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
