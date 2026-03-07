import { describe, it, expect } from "vitest";

describe("Example test suite", () => {
  it("passes basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("validates mock data structure", () => {
    const trackSlugs = ["lvn", "rn", "fnp", "pmhnp"];
    expect(trackSlugs).toHaveLength(4);
    expect(trackSlugs).toContain("rn");
  });
});
