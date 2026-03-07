/**
 * Shared OpenAI client - server-side only.
 * Uses OPENAI_API_KEY from env. Never expose to client.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

/** Get OpenAI client instance. Returns null if API key not configured. */
export function getOpenAIClient(): OpenAI | null {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.trim() === "") return null;
  _client = new OpenAI({ apiKey: key });
  return _client;
}

/** Check if OpenAI is configured (key present). Does not validate the key. */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.trim() !== "");
}
