import { describe, it, expect } from "vitest";
import { computeBlueprintBoost, isBlueprintSatisfied } from "../blueprint";

describe("computeBlueprintBoost", () => {
  it("returns 0 when no targets", () => {
    const boost = computeBlueprintBoost(
      { questionId: "q1", domainId: "d1", systemId: "s1", topicId: null },
      [],
      [],
      10
    );
    expect(boost).toBe(0);
  });

  it("returns higher boost for underrepresented domain", () => {
    const boost = computeBlueprintBoost(
      { questionId: "q1", domainId: "d1", systemId: null, topicId: null },
      [{ domainId: "d1", systemId: null, topicId: null, servedCount: 0, correctCount: 0, targetMin: null, targetMax: null }],
      [{ domainId: "d1", systemId: null, weightPct: 20, questionCount: 20 }],
      50
    );
    expect(boost).toBeGreaterThan(0);
  });
});

describe("isBlueprintSatisfied", () => {
  it("returns true when no targets", () => {
    expect(isBlueprintSatisfied([], [], 50)).toBe(true);
  });

  it("returns false when target not met", () => {
    const targets = [{ domainId: "d1", systemId: null, weightPct: 20, questionCount: 15 }];
    const progress = [{ domainId: "d1", systemId: null, topicId: null, servedCount: 5, correctCount: 3, targetMin: null, targetMax: null }];
    expect(isBlueprintSatisfied(progress, targets, 50)).toBe(false);
  });

  it("returns true when targets met", () => {
    const targets = [{ domainId: "d1", systemId: null, weightPct: 20, questionCount: 10 }];
    const progress = [{ domainId: "d1", systemId: null, topicId: null, servedCount: 12, correctCount: 8, targetMin: null, targetMax: null }];
    expect(isBlueprintSatisfied(progress, targets, 50)).toBe(true);
  });
});
