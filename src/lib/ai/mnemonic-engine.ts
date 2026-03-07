/**
 * Mnemonic engine - supports 5 mnemonic types
 */

import type { MnemonicType } from "@/types/ai-tutor";

export const MNEMONIC_TYPES: MnemonicType[] = [
  "simple",
  "acronym",
  "visual_hook",
  "story",
  "compare_contrast",
];

export const MNEMONIC_LABELS: Record<MnemonicType, string> = {
  simple: "Simple mnemonic",
  acronym: "Acronym",
  visual_hook: "Visual memory hook",
  story: "Story mnemonic",
  compare_contrast: "Compare/contrast cue",
};

export const MNEMONIC_INSTRUCTIONS: Record<MnemonicType, string> = {
  simple: "Create a short phrase, rhyme, or catchy saying to remember the concept.",
  acronym: "Create an acronym where each letter stands for a key term (e.g., MONA for MI drugs).",
  visual_hook: "Describe a vivid mental image the student can picture to recall the concept.",
  story: "Create a brief narrative or scenario that encodes the key facts.",
  compare_contrast: "Create a memory cue that contrasts this concept with a similar one to avoid confusion.",
};
