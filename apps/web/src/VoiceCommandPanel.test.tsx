import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { VoiceCommandPanel } from "./VoiceCommandPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Build 044 voice command confirmation", () => {
  test("requires a visible preview and explicit click before a device action", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/voice/preview")) {
        return {
          ok: true,
          json: async () => ({
            status: "resolved",
            message: "Review and confirm exact action.",
            confirmation_required: true,
            executable: true,
            entity_id: "light.living_room",
            friendly_name: "Living room lamp",
            action: "on",
            confirmation_rule: "explicit_exact_allowlisted_level_1_direct",
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          accepted: true,
          entity_id: "light.living_room",
          domain: "light",
          action: "on",
          tool_key: "home_assistant.light.set",
          state: "on",
        }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    const change = vi.fn();
    render(
      <VoiceCommandPanel
        draft="turn on the living room lamp"
        disabled={false}
        onDraftChange={change}
        onUseAsChat={vi.fn()}
      />,
    );
    expect(fetchMock).toHaveBeenCalledTimes(0);
    expect(screen.queryByText("Confirm exact action")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Review voice command"));
    await waitFor(() => {
      expect(screen.getByText("Confirm exact action")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Move question to Chat")).toBeDisabled();
    fireEvent.click(screen.getByText("Confirm exact action"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain("/home-assistant/control");
    await waitFor(() => expect(change).toHaveBeenCalledWith(""));
    expect(screen.queryByText("Confirm exact action")).not.toBeInTheDocument();
  });

  test("blocked voice commands cannot execute or move into Chat", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "blocked",
        executable: false,
        message: "Bulk commands are blocked.",
        confirmation_required: true,
        entity_id: null,
        friendly_name: null,
        action: null,
        confirmation_rule: "bulk_commands_never_execute",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const useChat = vi.fn();
    render(
      <VoiceCommandPanel
        draft="turn off all lights"
        disabled={false}
        onDraftChange={vi.fn()}
        onUseAsChat={useChat}
      />,
    );
    fireEvent.click(screen.getByText("Review voice command"));
    await waitFor(() => expect(screen.getByText("Bulk commands are blocked.")).toBeInTheDocument());
    expect(screen.queryByText("Confirm exact action")).not.toBeInTheDocument();
    expect(screen.getByText("Move question to Chat")).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useChat).not.toHaveBeenCalled();
  });

  test("changing the text invalidates the prior review", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "resolved",
        executable: true,
        message: "Review.",
        confirmation_required: true,
        entity_id: "light.living_room",
        friendly_name: "Living room lamp",
        action: "on",
        confirmation_rule: "review_required",
      }),
    })));
    const { rerender } = render(
      <VoiceCommandPanel
        draft="turn on the living room lamp"
        disabled={false}
        onDraftChange={vi.fn()}
        onUseAsChat={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Review voice command"));
    await waitFor(() => expect(screen.getByText("Confirm exact action")).toBeInTheDocument());
    rerender(
      <VoiceCommandPanel
        draft="turn on the hallway lights"
        disabled={false}
        onDraftChange={vi.fn()}
        onUseAsChat={vi.fn()}
      />,
    );
    await waitFor(() => expect(screen.queryByText("Confirm exact action")).not.toBeInTheDocument());
  });
});
