import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {InstalledSource261Panel} from "./InstalledSource261Panel";

describe("Build 261 original Windows launcher / signed source candidate panel", () => {
  it("remains disabled without three independent signed inputs, with no restart or TEST action", () => {
    const {container} = render(<InstalledSource261Panel expectedSha={"9".repeat(40)} trustedIssuerKey={null} />);
    expect(screen.getByRole("region", {name: /Build 261 Windows installed source/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify three independently pinned/i}) as HTMLButtonElement).disabled)
      .toBe(true);
    expect(container.textContent).toContain("NOT ATTESTED");
    expect(container.textContent).toContain("DO NOT MODIFY");
    expect(container.textContent).toContain("OFF / NOT AUTHORIZED / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
