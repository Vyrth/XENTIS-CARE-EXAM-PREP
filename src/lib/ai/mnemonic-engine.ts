/**
 * Mnemonic engine - supports 5 mnemonic styles for /api/ai/mnemonic
 */

import type { MnemonicStyle } from "@/lib/ai/mnemonic/types";

export const MNEMONIC_STYLES: MnemonicStyle[] = [
  "phrase",
  "acronym",
  "story",
  "visual_hook",
  "compare_contrast",
];

export const MNEMONIC_LABELS: Record<MnemonicStyle, string> = {
  phrase: "Phrase / rhyme",
  acronym: "Acronym",
  story: "Story mnemonic",
  visual_hook: "Visual memory hook",
  compare_contrast: "Compare/contrast cue",
};

export const MNEMONIC_INSTRUCTIONS: Record<MnemonicStyle, string> = {
  phrase:
    "Create a short phrase, rhyme, or catchy saying to remember the concept.",
  acronym:
    "Create an acronym where each letter stands for a key term (e.g., MONA for MI drugs).",
  story: "Create a brief narrative or scenario that encodes the key facts.",
  visual_hook:
    "Describe a vivid mental image the student can picture to recall the concept.",
  compare_contrast:
    "Create a memory cue that contrasts this concept with a similar one to avoid confusion.",
};
