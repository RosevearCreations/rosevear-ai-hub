import { afterEach, describe, expect, it, vi } from "vitest";
import { assessClientSource262, CLIENT_SOURCE_262_MARKER, inspectSameOriginClient262 } from "./clientReadiness262";

afterEach(() => vi.unstubAllGlobals());
describe("Build 262 same-origin source observation", () => {
  it("rejects fallback HTML, mismatched markers, and missing source", () => {
    expect(assessClientSource262(200, "text/html", CLIENT_SOURCE_262_MARKER)).toBe("UNVERIFIED_SOURCE_HOLD");
    expect(assessClientSource262(404, "text/javascript", CLIENT_SOURCE_262_MARKER)).toBe("UNVERIFIED_SOURCE_HOLD");
    expect(assessClientSource262(200, "text/javascript", "other release")).toBe("UNVERIFIED_SOURCE_HOLD");
  });
  it("only recognizes a served candidate, never an installed release", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: { get: () => "text/javascript; charset=utf-8" },
      text: async () => `export const MARKER = "${CLIENT_SOURCE_262_MARKER}";`,
    }));
    expect(await inspectSameOriginClient262()).toBe("SERVING_BUILD_262_MODULE_CANDIDATE");
    expect(fetch).toHaveBeenCalledWith("/src/clientReadiness262.ts", {
      cache: "no-store", credentials: "same-origin", redirect: "error",
    });
  });
  it("fails closed when unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await inspectSameOriginClient262()).toBe("UNVERIFIED_SOURCE_HOLD");
  });
});
