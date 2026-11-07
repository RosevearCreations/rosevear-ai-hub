import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {CommsTruth267Panel} from "./CommsTruth267Panel";

afterEach(cleanup);
describe("Build 267 offline original private trust panel",()=>{
  it("displays gated, noninteractive HOLD without signed original evidence",()=>{
    const {container}=render(<CommsTruth267Panel prior={null} get={null} shutdown={null}
      acceptance={null} audit={null} closure={null} decision={null}/>);
    expect(screen.getByRole("region",{name:/Build 267 original receiver source-of-truth/i})).toBeTruthy();
    const button=screen.getByRole("button",{name:/Verify private source, independent trust/i}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(3);
    expect(container.textContent).toContain("ORIGINAL SOURCE HOLD");
    expect(container.textContent).toContain("INDEPENDENT TRUST HOLD");
    expect(container.textContent).toContain("TRIAL AUTHORIZATION HOLD");
    expect(container.textContent).toContain("DISCONNECTED / HOLD");
    expect(container.querySelector('button[type="submit"]')).toBeNull();
  });
});
