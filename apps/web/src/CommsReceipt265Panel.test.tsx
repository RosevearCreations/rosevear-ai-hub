import {render,screen,cleanup} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {CommsReceipt265Panel} from "./CommsReceipt265Panel";

afterEach(cleanup);
describe("Build 265 first Comms TEST evidence panel",()=>{
  it("never presents a connected status or verification button without original proof",()=>{
    const {container}=render(<CommsReceipt265Panel prior={null}/>);
    expect(screen.getByRole("region",{name:/Build 265 first genuine Comms TEST receipt/i})).toBeTruthy();
    const button=screen.getByRole("button",{name:/Verify signed private GET, shutdown and owners/i}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.textContent).toContain("DISCONNECTED / HOLD");
    expect(container.textContent).toContain("INDEPENDENT ACCEPTANCE HOLD");
    // Three original Build 265 receipts plus three read-only Build 266 audit records.
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(6);
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
