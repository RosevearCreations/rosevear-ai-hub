import {render,screen,cleanup} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {RuntimeAuthority264Panel} from "./RuntimeAuthority264Panel";

afterEach(cleanup);
describe("Build 264 offline field acceptance UI",()=>{
  it("keeps local launcher authority and remote TEST locked with no evidence",()=>{
    const {container}=render(<RuntimeAuthority264Panel expectedSha={"a".repeat(40)} trustedIssuerKey={null}/>);
    expect(screen.getByRole("region",{name:/Build 264 original Windows authority/i})).toBeTruthy();
    const button = screen.getByRole("button",{name:/Verify original field and separate Comms TEST/i}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain("ORIGINAL FIELD HOLD");
    expect(container.textContent).toContain("OFF / NOT AUTHORIZED");
    expect(container.textContent).toContain("Customer/device actions");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    // Five original Build 264 uploads plus three optional Build 265 post-TEST receipts.
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(8);
  });
});
