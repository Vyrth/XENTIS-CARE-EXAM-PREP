import { describe, it, expect } from "vitest";
import {
  rankCandidatesForAdaptive,
  thetaProximityScore,
  exposurePenaltyScore,
} from "../selection";

describe("thetaProximityScore", () => {
  it("returns 1 when difficulty equals theta", () => {
    expect(thetaProximityScore(0, 0)).toBe(1);
  });

  it("returns lower score when farther from theta", () => {
    const close = thetaProximityScore(0.5, 0);
    const far = thetaProximityScore(2, 0);
    expect(close).toBeGreaterThan(far);
  });
});

describe("exposurePenaltyScore", () => {
  it("returns 0 when below threshold", () => {
    expect(exposurePenaltyScore(10, 50)).toBe(0);
  });

  it("returns positive when above threshold", () => {
    expect(exposurePenaltyScore(60, 50)).toBeGreaterThan(0);
  });
});

describe("rankCandidatesForAdaptive", () => {
  it("ranks by theta proximity first", () => {
    const candidates = [
      { questionId: "a", difficultyB: 2, hasCalibration: true, exposureCount: 0, domainId: null, systemId: null, topicId: null },
      { questionId: "b", difficultyB: 0, hasCalibration: true, exposureCount: 0, domainId: null, systemId: null, topicId: null },
      { questionId: "c", difficultyB: -1, hasCalibration: true, exposureCount: 0, domainId: null, systemId: null, topicId: null },
    ];
    const ranked = rankCandidatesForAdaptive(candidates, {
      thetaEstimate: 0,
      blueprintProgress: [],
      blueprintTargets: [],
      totalServed: 0,
    });
    expect(ranked[0].questionId).toBe("b");
  });

  it("prefers calibrated questions", () => {
    const candidates = [
      { questionId: "a", difficultyB: 0, hasCalibration: false, exposureCount: 0, domainId: null, systemId: null, topicId: null },
      { questionId: "b", difficultyB: 0, hasCalibration: true, exposureCount: 0, domainId: null, systemId: null, topicId: null },
    ];
    const ranked = rankCandidatesForAdaptive(candidates, {
      thetaEstimate: 0,
      blueprintProgress: [],
      blueprintTargets: [],
      totalServed: 0,
    });
    expect(ranked[0].questionId).toBe("b");
  });
});
