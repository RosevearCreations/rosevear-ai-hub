import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { SectionHelp } from "./HelpSystem";

const sections = [
  "Home",
  "Chat",
  "Knowledge",
  "Devices",
  "Cameras",
  "MQTT",
  "Notifications",
  "System",
  "Automations",
  "Confirmations",
  "Audit",
  "Secrets",
  "Tools",
  "Users",
];

describe("SectionHelp", () => {
  afterEach(() => cleanup());

  test.each(sections)("provides detailed contextual help for %s", (section) => {
    render(<SectionHelp section={section} />);
    fireEvent.click(screen.getByRole("button", { name: "Help for " + section }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Common tasks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Safety and permissions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Troubleshooting" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("Vault help describes the first-party architecture without offering password entry", () => {
    render(<SectionHelp section="Vault" />);
    fireEvent.click(screen.getByRole("button", { name: "Help for Vault" }));
    expect(screen.getByText(/first-party, locally hosted household password and document vault/)).toBeInTheDocument();
    expect(screen.getByText(/No password storage is available here/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("closes help after navigation and restores focus when dismissed with Escape", () => {
    const { rerender } = render(<SectionHelp section="Home" />);
    const trigger = screen.getByRole("button", { name: "Help for Home" });
    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    rerender(<SectionHelp section="Cameras" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
