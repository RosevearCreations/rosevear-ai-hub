import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessChain257Panel } from "./ProcessChain257Panel";

describe("Build 257 Windows chain owner review", () => {
  it("remains disabled and receiver-OFF without both external signatures", () => {
    const {container} = render(<ProcessChain257Panel expectedSha={"a".repeat(40)} trustedIssuerKey={null} />);
    expect(screen.getByRole("region", {name: /Build 257 independent Windows process-chain/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify both signed evidence candidates locally/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("OFF / HOLD");
    expect(container.textContent).toContain("NOT ATTESTED");
    expect(container.textContent).toContain("Network/device actions");
    expect(container.querySelectorAll('button[type="submit"]')).toHaveLength(0);
  });
});
