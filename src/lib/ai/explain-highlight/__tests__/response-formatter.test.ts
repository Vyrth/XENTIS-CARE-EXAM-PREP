import { describe, it, expect } from "vitest";
import {
  formatExplainHighlightResponse,
  getFallbackResponse,
} from "../response-formatter";

describe("formatExplainHighlightResponse", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      simpleExplanation: "CO2 narcosis occurs when...",
      boardTip: "Common exam question...",
      memoryTrick: "High O2 + COPD = bad",
      suggestedNextStep: "Practice 5 questions.",
    });
    const result = formatExplainHighlightResponse(raw);
    expect(result).toEqual({
      simpleExplanation: "CO2 narcosis occurs when...",
      boardTip: "Common exam question...",
      memoryTrick: "High O2 + COPD = bad",
      suggestedNextStep: "Practice 5 questions.",
    });
  });

  it("parses JSON wrapped in markdown code block", () => {
    const raw = "```json\n" + JSON.stringify({
      simpleExplanation: "Test",
      boardTip: "Tip",
      memoryTrick: "Trick",
      suggestedNextStep: "Step",
    }) + "\n```";
    const result = formatExplainHighlightResponse(raw);
    expect(result?.simpleExplanation).toBe("Test");
  });

  it("returns null when simpleExplanation is empty", () => {
    const raw = JSON.stringify({
      simpleExplanation: "",
      boardTip: "Tip",
      memoryTrick: "Trick",
      suggestedNextStep: "Step",
    });
    const result = formatExplainHighlightResponse(raw);
    expect(result).toBeNull();
  });

  it("uses fallbacks for missing optional fields", () => {
    const raw = JSON.stringify({
      simpleExplanation: "Only this",
    });
    const result = formatExplainHighlightResponse(raw);
    expect(result?.simpleExplanation).toBe("Only this");
    expect(result?.boardTip).toBe("Review this concept in your study materials.");
    expect(result?.memoryTrick).toBe("Try creating your own mnemonic.");
    expect(result?.suggestedNextStep).toBe("Practice related questions.");
  });

  it("returns null for invalid JSON", () => {
    const result = formatExplainHighlightResponse("not json at all");
    expect(result).toBeNull();
  });
});

describe("getFallbackResponse", () => {
  it("returns valid fallback with all required fields", () => {
    const fallback = getFallbackResponse();
    expect(fallback.simpleExplanation).toBeTruthy();
    expect(fallback.boardTip).toBeTruthy();
    expect(fallback.memoryTrick).toBeTruthy();
    expect(fallback.suggestedNextStep).toBeTruthy();
  });
});
