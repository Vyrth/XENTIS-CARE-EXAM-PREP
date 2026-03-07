/**
 * AI service layer - server-only exports.
 * Central entry for OpenAI client, orchestrator, prompt builder, types.
 */

export { getOpenAIClient, isOpenAIConfigured } from "./openai-client";
export { sendPrompt, runTutorMode } from "./ai-orchestrator";
export { buildPrompt } from "./prompt-builder";
export type {
  TutorMode,
  AITrack,
  MnemonicType,
  SimplePromptRequest,
  SimplePromptResponse,
  TutorModeParams,
  TutorParams,
  TutorResponse,
  RetrievalChunk,
} from "./types";
