/**
 * Adapter: maps AI Factory (GenerationConfig) to Content Factory (ContentFactoryRequest)
 * and Content Factory output to persistence-compatible shapes.
 */

import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { ContentFactoryRequest, ContentMode } from "./types";
import {
  PMHNP_PSYCHOPHARM_FOCUS,
  PMHNP_THERAPY_FOCUS,
} from "@/lib/admin/pmhnp-mass-content-plan";
import { LVN_SCOPE_GUARDRAILS } from "@/lib/admin/lvn-mass-content-plan";

const TRACK_MAP = ["lvn", "rn", "fnp", "pmhnp"] as const;

/** LVN scope-of-practice guardrails (condensed for prompt) */
function getLVNScopeGuardrails(): string {
  const within = LVN_SCOPE_GUARDRAILS.withinScope.join("; ");
  const delegate = LVN_SCOPE_GUARDRAILS.delegateToRN.join("; ");
  const report = LVN_SCOPE_GUARDRAILS.reportImmediately.join("; ");
  return `Scope guardrails: LVN within scope: ${within}. Delegate to RN: ${delegate}. Report immediately: ${report}.`;
}

/** PMHNP system-specific prompt emphasis */
function resolvePMHNPObjective(
  boardFocus: string | undefined,
  systemName: string | undefined
): string | undefined {
  const base = boardFocus?.trim();
  if (!base || !systemName) return base || undefined;
  const sys = systemName.toLowerCase();
  if (sys.includes("psychopharmacology")) return `${base} ${PMHNP_PSYCHOPHARM_FOCUS}`;
  if (sys.includes("therapy") && sys.includes("modalities")) return `${base} ${PMHNP_THERAPY_FOCUS}`;
  return base;
}

/** Convert GenerationConfig + content type to ContentFactoryRequest */
export function toContentFactoryRequest(
  config: GenerationConfig,
  contentMode: ContentMode,
  options?: { domainName?: string; quantity?: number; sectionCount?: number }
): ContentFactoryRequest {
  const track = TRACK_MAP.includes(config.trackSlug as (typeof TRACK_MAP)[number])
    ? (config.trackSlug as ContentFactoryRequest["track"])
    : "rn";

  const boardFocus = config.boardFocus ?? config.objective;
  let objective =
    track === "pmhnp"
      ? resolvePMHNPObjective(boardFocus, config.systemName) ?? config.objective
      : config.objective ?? boardFocus;
  if (track === "lvn") {
    const base = objective ?? boardFocus ?? "";
    objective = base ? `${base} ${getLVNScopeGuardrails()}` : getLVNScopeGuardrails();
  }

  return {
    track,
    contentMode,
    domain: options?.domainName ?? config.domainName,
    system: config.systemName,
    topic: config.topicName,
    objective: objective ?? boardFocus,
    difficulty: config.targetDifficulty,
    quantity:
      contentMode === "flashcard_deck"
        ? config.cardCount ?? options?.quantity ?? config.batchCount ?? 8
        : options?.quantity ?? config.batchCount ?? 1,
    style: {
      includeMnemonics: true,
      emphasis: objective ?? config.objective,
    },
    itemType: config.itemTypeSlug ?? "single_best_answer",
    boardFocus: boardFocus ?? objective,
    sectionCount: config.sectionCount ?? options?.sectionCount ?? (contentMode === "study_guide_section_pack" ? 4 : undefined),
    flashcardDeckMode: config.flashcardDeckMode,
    flashcardStyle: config.flashcardStyle,
    sourceText: config.sourceText,
  };
}
