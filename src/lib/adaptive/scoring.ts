/**
 * Adaptive exam scoring - theta update, readiness, stop rules.
 * Pure functions for unit testing. IRT/EAP-style logic, upgradeable later.
 */

/** Confidence band labels for readiness display */
export type ConfidenceBand = "at_risk" | "borderline" | "likely_pass" | "strong_pass";

/** Input for theta update (one item response) */
export interface ThetaUpdateInput {
  currentTheta: number;
  currentSE: number;
  isCorrect: boolean;
  difficultyB: number;
  discriminationA: number;
  /** Optional: guessing parameter (3PL). Default 0. */
  guessingC?: number;
}

/** Result of theta update */
export interface ThetaUpdateResult {
  theta: number;
  standardError: number;
}

/** Input for stop rule evaluation */
export interface StopRuleInput {
  questionCount: number;
  minQuestions: number;
  maxQuestions: number;
  standardError: number;
  targetStandardError: number;
  blueprintSatisfied: boolean;
}

/** Result of stop rule evaluation */
export interface StopRuleResult {
  shouldStop: boolean;
  reason: "min_not_met" | "max_reached" | "precision_met" | "blueprint_met" | null;
}

/** Input for readiness score calculation */
export interface ReadinessInput {
  theta: number;
  standardError: number;
  /** Passing theta threshold (e.g. 0 for standard scale) */
  passingTheta?: number;
}

/** Result of readiness calculation */
export interface ReadinessResult {
  score: number;
  band: ConfidenceBand;
}

// -----------------------------------------------------------------------------
// IRT helpers (2PL/3PL)
// -----------------------------------------------------------------------------

/** P(correct | theta) for 2PL: 1 / (1 + exp(-a*(theta - b))) */
export function probabilityCorrect2PL(
  theta: number,
  difficultyB: number,
  discriminationA: number,
  guessingC = 0
): number {
  const exponent = -discriminationA * (theta - difficultyB);
  const p = 1 / (1 + Math.exp(exponent));
  return guessingC + (1 - guessingC) * p;
}

/** Fisher information for 2PL at theta: a^2 * P * (1-P) */
function fisherInformation(
  theta: number,
  difficultyB: number,
  discriminationA: number,
  guessingC = 0
): number {
  const p = probabilityCorrect2PL(theta, difficultyB, discriminationA, guessingC);
  const pStar = (p - guessingC) / (1 - guessingC); // P* for 3PL
  if (pStar <= 0 || pStar >= 1) return 0;
  return discriminationA * discriminationA * pStar * (1 - pStar);
}

// -----------------------------------------------------------------------------
// Theta update (simplified one-step Bayesian/EAP)
// -----------------------------------------------------------------------------

/**
 * Update theta estimate after one item response.
 * Uses Newton-Raphson style step: theta_new = theta_old + (response - P) * weight.
 * SE decreases with item information. Modular for future full EAP/MLE.
 */
export function updateThetaEstimate(input: ThetaUpdateInput): ThetaUpdateResult {
  const {
    currentTheta,
    currentSE,
    isCorrect,
    difficultyB,
    discriminationA,
    guessingC = 0,
  } = input;

  const p = probabilityCorrect2PL(currentTheta, difficultyB, discriminationA, guessingC);
  const residual = (isCorrect ? 1 : 0) - p;

  // Information from this item
  const info = fisherInformation(currentTheta, difficultyB, discriminationA, guessingC);

  // Learning rate: scale by 1/sqrt(1 + info) to avoid overshoot early
  const weight = 1 / (1 + Math.sqrt(info));
  const delta = residual * weight * 2; // scale for reasonable step size

  const newTheta = currentTheta + delta;

  // SE update: posterior variance decreases with information
  const priorVariance = currentSE * currentSE;
  const posteriorVariance = 1 / (1 / priorVariance + info);
  const newSE = Math.sqrt(Math.max(0.01, posteriorVariance));

  return {
    theta: clampTheta(newTheta),
    standardError: Math.min(newSE, 9.99),
  };
}

function clampTheta(theta: number): number {
  return Math.max(-4, Math.min(4, theta));
}

// -----------------------------------------------------------------------------
// Stop rules
// -----------------------------------------------------------------------------

/**
 * Evaluate whether the adaptive exam should stop.
 * Order: max reached > precision met > blueprint met > min not met.
 */
export function shouldStopAdaptiveExam(input: StopRuleInput): StopRuleResult {
  const {
    questionCount,
    minQuestions,
    maxQuestions,
    standardError,
    targetStandardError,
    blueprintSatisfied,
  } = input;

  if (questionCount >= maxQuestions) {
    return { shouldStop: true, reason: "max_reached" };
  }

  if (questionCount < minQuestions) {
    return { shouldStop: false, reason: "min_not_met" };
  }

  if (standardError <= targetStandardError) {
    return { shouldStop: true, reason: "precision_met" };
  }

  if (blueprintSatisfied) {
    return { shouldStop: true, reason: "blueprint_met" };
  }

  return { shouldStop: false, reason: null };
}

// -----------------------------------------------------------------------------
// Readiness score (theta + SE -> 0-100)
// -----------------------------------------------------------------------------

/**
 * Convert theta and standard error into a 0-100 readiness score.
 * Uses logistic transform: score = 100 / (1 + exp(-k*(theta - passingTheta)))
 * with SE affecting confidence band, not the raw score.
 */
export function computeReadinessFromTheta(input: ReadinessInput): ReadinessResult {
  const { theta, standardError, passingTheta = 0 } = input;

  const delta = theta - passingTheta;

  // Logistic: 0-100 scale. k=2 gives ~50 at delta=0, steep slope.
  const k = 2;
  const raw = 100 / (1 + Math.exp(-k * delta));
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  const band = getConfidenceBand(theta, standardError, passingTheta);

  return { score, band };
}

/**
 * Get confidence band from theta and SE.
 * Bands reflect likelihood of passing given uncertainty.
 */
export function getConfidenceBand(
  theta: number,
  standardError: number,
  passingTheta = 0
): ConfidenceBand {
  const delta = theta - passingTheta;

  // Lower bound of 95% CI (theta - 1.96*SE)
  const lower = delta - 1.96 * standardError;
  const upper = delta + 1.96 * standardError;

  if (lower >= 0.5) return "strong_pass";
  if (upper < -0.5) return "at_risk";
  if (lower >= 0 && upper >= 0) return "likely_pass";
  return "borderline";
}
