import {render, screen, cleanup} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {LauncherAcceptance263Panel} from "./LauncherAcceptance263Panel";

afterEach(cleanup);
describe("Build 263 original owner Windows receipt panel", () => {
  it("keeps signature check and Comms TEST blocked without independent inputs", () => {
    const {container} = render(<LauncherAcceptance263Panel expectedSha={"a".repeat(40)} trustedIssuerKey={null} />);
    expect(screen.getByRole("region", {name: /Build 263 signed Windows runtime acceptance/i})).toBeTruthy();
    expect((screen.getByRole("button", {name: /Verify signed local restart receipt/i}) as HTMLButtonElement).disabled)
      .toBe(true);
    expect(container.textContent).toContain("NOT INDEPENDENTLY ATTESTED");
    expect(container.textContent).toContain("OFF / NOT AUTHORIZED / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
