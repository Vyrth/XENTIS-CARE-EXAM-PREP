/**
 * data/mock - Shared types only (no runtime mock data).
 * Runtime imports use @/data/mock/types for TrackSlug, Question, Note, etc.
 * Mock data files (admin, questions, readiness, etc.) were removed in Phase 2D
 * as they had no runtime or test imports.
 */
export * from "./types";
