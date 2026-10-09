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
});
