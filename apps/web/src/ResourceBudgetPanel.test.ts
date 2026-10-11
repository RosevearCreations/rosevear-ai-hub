import { describe, expect, it } from "vitest";

import { gibibytes } from "./ResourceBudgetPanel";

describe("Build 048 resource display", () => {
  it("renders byte quantities as GiB without silently hiding invalid samples", () => {
    expect(gibibytes(0)).toBe("0.00 GiB");
    expect(gibibytes(1024 ** 3)).toBe("1.00 GiB");
    expect(gibibytes(1536 * 1024 ** 2)).toBe("1.50 GiB");
    expect(gibibytes(-1)).toBe("Unknown");
    expect(gibibytes(Number.NaN)).toBe("Unknown");
  });
});
