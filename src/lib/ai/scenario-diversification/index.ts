/**
 * Scenario Diversification Engine
 *
 * Enforces diversity across batches:
 * - age band, sex, care setting, phase, acuity, pharmacology angle
 * - generation memory per shard
 * - negative constraints in prompts
 * - archetype metadata on questions
 * - batch variety validation
 */

export * from "./archetypes";
export * from "./archetype-extractor";
export * from "./generation-memory";
export * from "./negative-constraints";
export * from "./variety-checker";
export * from "./diversification-context";
