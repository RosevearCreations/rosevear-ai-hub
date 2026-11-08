import { describe, expect, test } from "vitest";

import { buildHomeStartGuide, type HomeGuideInput } from "./homeStartGuideModel";

const ownerRoutes = ["Home", "Chat", "System", "Search & Help", "Workshop", "Knowledge"];
const readerRoutes = ["Home", "Chat", "System", "Search & Help", "Knowledge"];

function status(overrides: Partial<HomeGuideInput> = {}): HomeGuideInput {
  return { role: "owner", backend: "online", localAi: "online", modelCount: 0, ...overrides };
}

describe("Build 272 Home guide model", () => {
  test("shows an honest no-model empty state and never offers chat without a model", () => {
    const cards = buildHomeStartGuide(status(), ownerRoutes);
    expect(cards).toHaveLength(3);
    expect(cards[0]).toMatchObject({ key: "hub", state: "ready", destination: "System" });
    expect(cards[1]).toMatchObject({ key: "ai", state: "attention", title: "No local AI model installed", destination: "System" });
    expect(cards[1].detail).toContain("Nothing starts automatically");
    expect(cards[2]).toMatchObject({ key: "next", destination: "Workshop", actionLabel: "Open Workshop" });
  });

  test("offers chat only when local AI reports at least one model", () => {
    const cards = buildHomeStartGuide(status({ modelCount: 2 }), ownerRoutes);
    expect(cards[1]).toMatchObject({ state: "ready", destination: "Chat", actionLabel: "Open Chat" });
    expect(cards[1].detail).toContain("successful generation is not yet proven");
  });

  test("withholds actions while status is being checked and never assumes an offline service is ready", () => {
    const loading = buildHomeStartGuide(status({ backend: "loading", localAi: "loading", modelCount: null }), ownerRoutes);
    expect(loading[0]).toMatchObject({ state: "checking", destination: null, actionLabel: null });
    expect(loading[1]).toMatchObject({ state: "checking", destination: null, actionLabel: null });

    const offline = buildHomeStartGuide(status({ backend: "offline", localAi: "offline", modelCount: null }), ownerRoutes);
    expect(offline[0]).toMatchObject({ state: "attention", destination: "System" });
    expect(offline[1]).toMatchObject({ state: "attention", destination: "System" });
    expect(offline.every(card => card.destination !== "Chat")).toBe(true);
  });

  test("gives read-only users non-administrative guidance and no workshop actions", () => {
    const cards = buildHomeStartGuide(status({ role: "read_only", backend: "offline", localAi: "offline" }), readerRoutes);
    expect(cards[0]).toMatchObject({ destination: "Search & Help", actionLabel: "Open Search & Help" });
    expect(cards[1]).toMatchObject({ destination: "Search & Help" });
    expect(cards[2]).toMatchObject({ destination: "Knowledge", actionLabel: "Open Knowledge" });
    expect(cards.every(card => card.destination !== "Workshop")).toBe(true);
  });

  test("never presents actions outside the caller's allowed navigation routes", () => {
    const cards = buildHomeStartGuide(status({ modelCount: 1 }), ["Home"]);
    expect(cards.every(card => card.destination === null && card.actionLabel === null)).toBe(true);
  });

  test("does not treat missing, fractional or negative model counts as verified readiness", () => {
    for (const count of [null, -1, 1.5, Number.NaN]) {
      const ai = buildHomeStartGuide(status({ modelCount: count }), ownerRoutes)[1];
      expect(ai.state).toBe("checking");
      expect(ai.destination).not.toBe("Chat");
    }
  });
});
