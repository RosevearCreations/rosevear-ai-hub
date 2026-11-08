import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { HomeStartGuide } from "./HomeStartGuide";

afterEach(cleanup);

describe("Build 272 guided Home component", () => {
  test("shows clear status and navigates only after a user selects an allowed action", () => {
    const onNavigate = vi.fn();
    render(<HomeStartGuide status={{ role: "owner", backend: "online", localAi: "online", modelCount: 0 }}
      allowed={["Home", "Workshop", "System", "Chat"]} onNavigate={onNavigate} />);

    const guide = screen.getByRole("region", { name: "What should we do next?" });
    expect(within(guide).getByRole("heading", { name: "No local AI model installed" })).toBeInTheDocument();
    expect(within(guide).queryByRole("button", { name: "Open Chat" })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    fireEvent.click(within(guide).getByRole("button", { name: "Open Workshop" }));
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("Workshop");
  });

  test("uses safe empty states when only Home is permitted", () => {
    const onNavigate = vi.fn();
    render(<HomeStartGuide status={{ role: "read_only", backend: "loading", localAi: "loading", modelCount: null }}
      allowed={["Home"]} onNavigate={onNavigate} />);

    const guide = screen.getByRole("region", { name: "What should we do next?" });
    expect(within(guide).getAllByText("Checking")).toHaveLength(2);
    expect(within(guide).queryAllByRole("button")).toHaveLength(0);
    expect(within(guide).getAllByText(/No action is offered/)).toHaveLength(3);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
