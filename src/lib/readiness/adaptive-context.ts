/**
 * Adaptive AI Context Builder - converts user analytics into structured context for AI prompts.
 * Personalizes AI responses based on readiness, weak areas, confidence, and study progress.
 */

import type { ReadinessBand } from "@/types/readiness";

export interface AdaptiveContextInput {
  readinessScore?: number;
  readinessBand?: ReadinessBand | string;
  weakSystems?: { name: string; percent: number }[];
  weakDomains?: { name: string; percent: number }[];
  weakSkills?: { name: string; percent: number }[];
  weakItemTypes?: { name: string; percent: number }[];
  overconfidentRanges?: string[];
  underconfidentRanges?: string[];
  confidenceCalibration?: number;
  recentMistakes?: string[];
  systemBundleProgress?: Record<string, number>;
  studyGuideCompletion?: number;
  videoCompletion?: number;
  lastStudyMaterialsCompleted?: string[];
}

export interface AdaptiveContextOutput {
  /** Structured context string for AI prompt */
  contextString: string;
  /** Instructions to inject into system/user prompt */
  promptInstructions: string;
  /** Learner profile for response formatting */
  learnerProfile: "beginner" | "developing" | "near_ready" | "exam_ready" | "unknown";
  /** Saveable remediation suggestions derived from analytics */
  remediationSuggestions: string[];
}

/** Map readiness band to learner profile */
function bandToProfile(band: ReadinessBand | string | undefined, score?: number): AdaptiveContextOutput["learnerProfile"] {
  if (!band && score == null) return "unknown";
  const b = (band ?? "").toLowerCase();
  if (b === "exam_ready" || (score != null && score >= 85)) return "exam_ready";
  if (b === "ready" || (score != null && score >= 70)) return "near_ready";
  if (b === "developing" || (score != null && score >= 50)) return "developing";
  if (b === "not_ready" || (score != null && score < 50)) return "beginner";
  return "unknown";
}

/** Build prompt instructions based on learner profile and weak areas */
function buildPromptInstructions(
  profile: AdaptiveContextOutput["learnerProfile"],
  input: AdaptiveContextInput
): string {
  const parts: string[] = [];

  switch (profile) {
    case "beginner":
      parts.push("This learner is early in their prep. Use foundational explanations, avoid jargon, and build from basics.");
      break;
    case "developing":
      parts.push("This learner is building knowledge. Balance foundational content with exam-relevant application.");
      break;
    case "near_ready":
      parts.push("This learner is close to exam-ready. Emphasize board traps, test-taking strategies, and common distractors.");
      break;
    case "exam_ready":
      parts.push("This learner is exam-ready. Focus on refinement, high-yield recall, and test-taking polish.");
      break;
    default:
      parts.push("Provide clear, educational content appropriate for nursing board prep.");
  }

  const weakPharm = input.weakSkills?.some((s) => /pharm|medication|drug/i.test(s.name));
  if (weakPharm) {
    parts.push("The learner is weak in pharmacology. Include medication-focused reminders, key distinctions, and nursing considerations when relevant.");
  }

  const weakSata = input.weakItemTypes?.some((t) => /multiple|sata|select all|case/i.test(t.name));
  if (weakSata) {
    parts.push("The learner struggles with multiple-response and case-study items. Emphasize item-type reasoning: read each option independently, avoid all-or-nothing thinking.");
  }

  if (input.overconfidentRanges && input.overconfidentRanges.length > 0) {
    parts.push("The learner is overconfident in some areas (high confidence but lower accuracy). Gently correct overconfidence; encourage careful reasoning and reviewing missed questions.");
  }

  if (input.underconfidentRanges && input.underconfidentRanges.length > 0) {
    parts.push("The learner is underconfident. Be reassuring, use step-by-step teaching, and reinforce correct thinking.");
  }

  if (input.confidenceCalibration != null && input.confidenceCalibration < 60) {
    parts.push("The learner's confidence calibration is low. Use reassuring, step-by-step explanations and validate correct reasoning.");
  }

  if (input.recentMistakes && input.recentMistakes.length > 0) {
    parts.push(`Recent mistake topics: ${input.recentMistakes.slice(0, 5).join(", ")}. Address common confusions in these areas when relevant.`);
  }

  return parts.join(" ");
}

/** Build remediation suggestions for saveable output */
function buildRemediationSuggestions(input: AdaptiveContextInput): string[] {
  const suggestions: string[] = [];

  if (input.weakSystems && input.weakSystems.length > 0) {
    const weakest = input.weakSystems.sort((a, b) => a.percent - b.percent)[0];
    suggestions.push(`Practice 15-20 questions daily in ${weakest.name}`);
  }

  if (input.weakSkills?.some((s) => /pharm/i.test(s.name))) {
    suggestions.push("Review pharmacology study guide sections and drug classifications");
  }

  if (input.weakItemTypes?.some((t) => /multiple|sata/i.test(t.name))) {
    suggestions.push("Practice multiple-response and case-study questions; read each option independently");
  }

  if (input.studyGuideCompletion != null && input.studyGuideCompletion < 50) {
    suggestions.push("Complete at least 50% of study guides in weak systems");
  }

  if (input.overconfidentRanges && input.overconfidentRanges.length > 0) {
    suggestions.push("Review missed questions in overconfident ranges; slow down and verify before answering");
  }

  return suggestions;
}

/** Flexible analytics shape from API/dashboard - converts to AdaptiveContextInput */
export interface AnalyticsPayload {
  readinessScore?: number;
  readinessBand?: string;
  weakSystems?: { name: string; percent?: number }[] | string[];
  weakDomains?: { name: string; percent?: number }[] | string[];
  weakSkills?: { name: string; percent?: number }[] | string[];
  weakItemTypes?: { name: string; percent?: number }[] | string[];
  overconfidentRanges?: string[];
  underconfidentRanges?: string[];
  confidenceCalibration?: number;
  recentMistakes?: string[];
  systemBundleProgress?: Record<string, number>;
  studyGuideCompletion?: number;
  videoCompletion?: number;
  lastStudyMaterialsCompleted?: string[];
}

function toWeakList(
  arr: { name: string; percent?: number }[] | string[] | undefined
): { name: string; percent: number }[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    if (typeof item === "string") return { name: item, percent: 0 };
    return { name: String(item.name), percent: Number(item.percent ?? 0) };
  });
}

/** Convert API/dashboard analytics payload to AdaptiveContextInput */
export function analyticsToAdaptiveInput(payload: AnalyticsPayload | null | undefined): AdaptiveContextInput {
  if (!payload) return {};
  return {
    readinessScore: payload.readinessScore,
    readinessBand: payload.readinessBand,
    weakSystems: toWeakList(payload.weakSystems),
    weakDomains: toWeakList(payload.weakDomains),
    weakSkills: toWeakList(payload.weakSkills),
    weakItemTypes: toWeakList(payload.weakItemTypes),
    overconfidentRanges: payload.overconfidentRanges,
    underconfidentRanges: payload.underconfidentRanges,
    confidenceCalibration: payload.confidenceCalibration,
    recentMistakes: payload.recentMistakes,
    systemBundleProgress: payload.systemBundleProgress,
    studyGuideCompletion: payload.studyGuideCompletion,
    videoCompletion: payload.videoCompletion,
    lastStudyMaterialsCompleted: payload.lastStudyMaterialsCompleted,
  };
}

/** Build full adaptive context for AI prompts */
export function buildAdaptiveContext(input: AdaptiveContextInput): AdaptiveContextOutput {
  const profile = bandToProfile(input.readinessBand, input.readinessScore);
  const promptInstructions = buildPromptInstructions(profile, input);
  const remediationSuggestions = buildRemediationSuggestions(input);

  const contextParts: string[] = [];

  if (input.readinessBand || input.readinessScore != null) {
    contextParts.push(`Readiness: ${input.readinessBand ?? "unknown"} (${input.readinessScore ?? "?"}%)`);
  }

  if (input.weakSystems && input.weakSystems.length > 0) {
    contextParts.push(`Weak systems: ${input.weakSystems.map((s) => `${s.name} (${s.percent}%)`).join("; ")}`);
  }

  if (input.weakDomains && input.weakDomains.length > 0) {
    contextParts.push(`Weak domains: ${input.weakDomains.map((d) => `${d.name} (${d.percent}%)`).join("; ")}`);
  }

  if (input.weakSkills && input.weakSkills.length > 0) {
    contextParts.push(`Weak skills: ${input.weakSkills.map((s) => `${s.name} (${s.percent}%)`).join("; ")}`);
  }

  if (input.weakItemTypes && input.weakItemTypes.length > 0) {
    contextParts.push(`Weak item types: ${input.weakItemTypes.map((t) => `${t.name} (${t.percent}%)`).join("; ")}`);
  }

  if (input.overconfidentRanges && input.overconfidentRanges.length > 0) {
    contextParts.push(`Overconfident ranges: ${input.overconfidentRanges.join(", ")}`);
  }

  if (input.underconfidentRanges && input.underconfidentRanges.length > 0) {
    contextParts.push(`Underconfident ranges: ${input.underconfidentRanges.join(", ")}`);
  }

  if (input.confidenceCalibration != null) {
    contextParts.push(`Confidence calibration: ${input.confidenceCalibration}%`);
  }

  if (input.recentMistakes && input.recentMistakes.length > 0) {
    contextParts.push(`Recent mistakes: ${input.recentMistakes.slice(0, 5).join("; ")}`);
  }

  if (input.studyGuideCompletion != null) {
    contextParts.push(`Study guide completion: ${input.studyGuideCompletion}%`);
  }

  if (input.videoCompletion != null) {
    contextParts.push(`Video completion: ${input.videoCompletion}%`);
  }

  if (input.lastStudyMaterialsCompleted && input.lastStudyMaterialsCompleted.length > 0) {
    contextParts.push(`Recently completed: ${input.lastStudyMaterialsCompleted.slice(0, 3).join(", ")}`);
  }

  const contextString =
    contextParts.length > 0
      ? `Learner analytics:\n${contextParts.join("\n")}`
      : "";

  return {
    contextString,
    promptInstructions,
    learnerProfile: profile,
    remediationSuggestions,
  };
}
