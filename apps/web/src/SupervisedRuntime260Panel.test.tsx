import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {SupervisedRuntime260Panel} from "./SupervisedRuntime260Panel";

describe("Build 260 supervised runtime UI", () => {
  it("requires separate signed owner and witness evidence, never exposes an activation control", () => {
    const {container} = render(<SupervisedRuntime260Panel expectedSha={"9".repeat(40)} trustedOriginalKey={null} />);
    expect(screen.getByRole("region", {name: /Build 260 supervised Windows release/i})).toBeDefined();
    expect((screen.getByRole("button", {name: /Verify supervised runtime/i}) as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("SUPERVISED ONLY — NO APP ACTION");
    expect(container.textContent).toContain("OFF / NO CHALLENGE / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
