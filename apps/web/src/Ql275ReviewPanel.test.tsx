import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Ql275ReviewPanel } from "./Ql275ReviewPanel";

afterEach(cleanup);

describe("Build 200 real I.T. QL-275 owner-deferred status", () => {
  it("displays Under Review without publishing evidence or enabling a network action", () => {
    render(<Ql275ReviewPanel />);
    const region = screen.getByRole("region", { name: "QL-275 deferred review status" });
    expect(screen.getByLabelText("QL-275 tracking status")).toHaveTextContent("Under Review");
    expect(region).toHaveTextContent("Paused at our request");
    expect(region.querySelectorAll("input, textarea, button")).toHaveLength(0);
    expect(screen.getByLabelText("QL-275 connection safety status")).toHaveTextContent("DISCONNECTED / HOLD");
    fireEvent.click(screen.getByText("What was verified before pausing?"));
    expect(region).toHaveTextContent("HTTP 404");
    expect(screen.getByRole("link", { name: "Inspect immutable original path" })).toHaveAttribute("href", expect.stringContaining("1eb0b0216c6d26e7de795339d7e3dbd6ebb9224b"));
    expect(screen.getByRole("link", { name: "Inspect source CI" })).toHaveAttribute("href", "https://github.com/RosevearCreations/rosevear-ai-hub/actions/runs/41164501279");
  });
});
