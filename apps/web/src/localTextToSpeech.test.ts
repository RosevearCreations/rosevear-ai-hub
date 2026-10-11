import { describe, expect, it } from "vitest";
import { speechExcerpt } from "./localTextToSpeech";

describe("Build 043 local speech text bounds", () => {
  it("keeps a short completed response intact", () => {
    expect(speechExcerpt(" Hello, Hub. ")).toBe("Hello, Hub.");
  });
  it("trims long messages to one bounded, readable excerpt", () => {
    const input = "Spoken answer ".repeat(100);
    const excerpt = speechExcerpt(input);
    expect(excerpt.length).toBeLessThanOrEqual(600);
    expect(excerpt.length).toBeGreaterThan(300);
    expect(excerpt.endsWith(" ")).toBe(false);
  });
  it("never expands content or automatically sends it", () => {
    expect(speechExcerpt("")).toBe("");
    expect(speechExcerpt("one two three", 7)).toBe("one two");
  });
});
