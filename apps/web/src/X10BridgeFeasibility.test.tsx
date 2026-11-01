import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { X10BridgeFeasibility, X10_DEVICE_TYPES, x10BridgeReadback } from "./X10BridgeFeasibility";

afterEach(cleanup);

describe("Build 215 X10 MQTT feasibility", () => {
  test("never turns broker observations or owner checklist into a supported control route", () => {
    expect(X10_DEVICE_TYPES).toHaveLength(3);
    const unknown = x10BridgeReadback({ mqttAvailable: false, observedTopics: null,
      interfaceVerified: false, ownerAuthorized: false });
    expect(unknown.missing).toHaveLength(4);
    const reviewed = x10BridgeReadback({ mqttAvailable: true, observedTopics: 2,
      interfaceVerified: true, ownerAuthorized: true });
    expect(reviewed.status).toContain("NO CONTROL");
    expect(reviewed.topicSummary).toContain("none prove X10 linkage");
  });
  test("owner reviews three devices and preview-only event flow without dispatch actions", () => {
    const { container } = render(<X10BridgeFeasibility mqttAvailable observedTopics={1} canReview />);
    const section = screen.getByRole("region", { name: "Build 215 MQTT and X10 feasibility workbench" });
    expect(section).toHaveTextContent("X10 motion sensor");
    fireEvent.click(screen.getByLabelText("Exact X10 controller/interface independently checked"));
    fireEvent.click(screen.getByLabelText("Owner permission discussed for a future offline trial"));
    expect(screen.getByText(/no physical bridge, safe-stop/)).toBeInTheDocument();
    fireEvent.click(within(section).getByText(/Preview-only X10 motion/));
    expect(section).toHaveTextContent("Meross device action");
    expect(container.querySelectorAll("iframe, video")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Reset feasibility review" }));
    expect(screen.getByRole("list", { name: "Unverified bridge requirements" })).toHaveTextContent("Owner authorization not recorded");
  });
  test("read-only accounts cannot edit the checklist", () => {
    render(<X10BridgeFeasibility mqttAvailable={false} observedTopics={null} canReview={false} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/device controls remain unavailable to all roles/)).toBeInTheDocument();
  });
});
