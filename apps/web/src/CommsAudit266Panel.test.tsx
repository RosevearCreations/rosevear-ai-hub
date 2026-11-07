import {render,screen,cleanup} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {CommsAudit266Panel} from "./CommsAudit266Panel";

afterEach(cleanup);
describe("Build 266 independent Comms audit offline panel",()=>{
  it("keeps receiver, replay and owner acceptance on HOLD without original proof",()=>{
    const {container}=render(<CommsAudit266Panel prior={null} get={null} shutdown={null} acceptance={null}/>);
    expect(screen.getByRole("region",{name:/Build 266 private receiver audit/i})).toBeTruthy();
    const button=screen.getByRole("button",{name:/Verify original Comms audit, nonce closure/i}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain("ORIGINAL AUDIT HOLD");
    expect(container.textContent).toContain("NONCE REPLAY HOLD");
    expect(container.textContent).toContain("OWNER DECISION HOLD");
    expect(container.textContent).toContain("DISCONNECTED / HOLD");
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(8);
    expect(container.textContent).toContain("ORIGINAL SOURCE HOLD");
    expect(container.textContent).toContain("INDEPENDENT TRUST HOLD");
    expect(container.textContent).toContain("TRIAL AUTHORIZATION HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
