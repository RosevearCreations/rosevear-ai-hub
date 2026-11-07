import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {CommsTrial268Panel} from "./CommsTrial268Panel";

afterEach(cleanup);
describe("Build 268 separately gated original private receiver panel",()=>{
  it("never enables a live GET without authenticated original field and independent authorization",()=>{
    const {container}=render(<CommsTrial268Panel prior={null} get={null} shutdown={null}
      acceptance={null} audit={null} closure={null} decision={null} source={null}
      witness={null} trial={null}/>);
    expect(screen.getByRole("region",{name:/Build 268 authenticated original receiver/i})).toBeTruthy();
    const button=screen.getByRole("button",{name:/Verify original receiver identity and one-GET/i}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(2);
    expect(container.textContent).toContain("ORIGINAL AUTHENTICATION HOLD");
    expect(container.textContent).toContain("SEPARATE TRIAL GRANT HOLD");
    expect(container.textContent).toContain("EXTERNAL PROOF REQUIRED");
    expect(container.textContent).toContain("DISCONNECTED / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
