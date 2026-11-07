import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {LauncherCustody259Panel} from "./LauncherCustody259Panel";

describe("Build 259 owner HOLD panel", () => {
  it("never enables signed TEST review without real external witnesses", () => {
    const {container} = render(<LauncherCustody259Panel expectedSha={"7".repeat(40)} trustedOriginalKey={null} />);
    expect(screen.getByRole("region", {name: /Build 259 Windows launcher custody/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify original issuer and separate offline challenge witness/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("HOLD — SUPERVISED ONLY");
    expect(container.textContent).toContain("NOT EXECUTED / OFF / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
