import { describe, it, expect } from "vitest";
import {
  updateThetaEstimate,
  shouldStopAdaptiveExam,
  computeReadinessFromTheta,
  getConfidenceBand,
  probabilityCorrect2PL,
} from "../scoring";

describe("probabilityCorrect2PL", () => {
  it("returns 0.5 when theta equals difficulty", () => {
    expect(probabilityCorrect2PL(0, 0, 1)).toBeCloseTo(0.5);
  });

  it("returns higher P when theta > difficulty", () => {
    expect(probabilityCorrect2PL(1, 0, 1)).toBeGreaterThan(0.5);
  });

  it("returns lower P when theta < difficulty", () => {
    expect(probabilityCorrect2PL(-1, 0, 1)).toBeLessThan(0.5);
  });
});

describe("updateThetaEstimate", () => {
  it("increases theta when correct on easy item", () => {
    const result = updateThetaEstimate({
      currentTheta: 0,
      currentSE: 1,
      isCorrect: true,
      difficultyB: -1,
      discriminationA: 1,
    });
    expect(result.theta).toBeGreaterThan(0);
  });

  it("decreases theta when incorrect on easy item", () => {
    const result = updateThetaEstimate({
      currentTheta: 0,
      currentSE: 1,
      isCorrect: false,
      difficultyB: -1,
      discriminationA: 1,
    });
    expect(result.theta).toBeLessThan(0);
  });

  it("reduces standard error after response", () => {
    const result = updateThetaEstimate({
      currentTheta: 0,
      currentSE: 2,
      isCorrect: true,
      difficultyB: 0,
      discriminationA: 1,
    });
    expect(result.standardError).toBeLessThan(2);
  });
});

describe("shouldStopAdaptiveExam", () => {
  it("stops when max questions reached", () => {
    const r = shouldStopAdaptiveExam({
      questionCount: 150,
      minQuestions: 75,
      maxQuestions: 150,
      standardError: 0.5,
      targetStandardError: 0.3,
      blueprintSatisfied: false,
    });
    expect(r.shouldStop).toBe(true);
    expect(r.reason).toBe("max_reached");
  });

  it("does not stop when below min questions", () => {
    const r = shouldStopAdaptiveExam({
      questionCount: 50,
      minQuestions: 75,
      maxQuestions: 150,
      standardError: 0.5,
      targetStandardError: 0.3,
      blueprintSatisfied: false,
    });
    expect(r.shouldStop).toBe(false);
    expect(r.reason).toBe("min_not_met");
  });

  it("stops when precision met (SE <= target)", () => {
    const r = shouldStopAdaptiveExam({
      questionCount: 80,
      minQuestions: 75,
      maxQuestions: 150,
      standardError: 0.25,
      targetStandardError: 0.3,
      blueprintSatisfied: false,
    });
    expect(r.shouldStop).toBe(true);
    expect(r.reason).toBe("precision_met");
  });
});

describe("computeReadinessFromTheta", () => {
  it("returns ~50 when theta equals passing", () => {
    const r = computeReadinessFromTheta({ theta: 0, standardError: 0.3, passingTheta: 0 });
    expect(r.score).toBeGreaterThanOrEqual(45);
    expect(r.score).toBeLessThanOrEqual(55);
  });

  it("returns higher score when theta above passing", () => {
    const r = computeReadinessFromTheta({ theta: 1, standardError: 0.3, passingTheta: 0 });
    expect(r.score).toBeGreaterThan(70);
  });

  it("returns lower score when theta below passing", () => {
    const r = computeReadinessFromTheta({ theta: -1, standardError: 0.3, passingTheta: 0 });
    expect(r.score).toBeLessThan(30);
  });
});

describe("getConfidenceBand", () => {
  it("returns strong_pass when theta well above passing", () => {
    expect(getConfidenceBand(1.5, 0.2, 0)).toBe("strong_pass");
  });

  it("returns at_risk when theta well below passing", () => {
    expect(getConfidenceBand(-1.5, 0.2, 0)).toBe("at_risk");
  });

  it("returns borderline when CI spans passing", () => {
    expect(getConfidenceBand(0, 0.5, 0)).toBe("borderline");
  });
});
