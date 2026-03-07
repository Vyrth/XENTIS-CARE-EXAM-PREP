/**
 * Mock High-Yield Intelligence data - blueprint, telemetry, student signal
 * Based on NCSBN-style blueprints and internal signals
 */

import type { TrackSlug } from "@/data/mock/types";
import type { BlueprintWeight, TopicBlueprintWeight, TelemetrySignal, StudentSignal } from "@/types/high-yield";

/** NCSBN NCLEX-RN style system weights (simplified) - Safe and Effective Care dominates */
export const MOCK_BLUEPRINT_BY_TRACK: Record<TrackSlug, BlueprintWeight[]> = {
  lvn: [
    { systemId: "sys-1", systemName: "Cardiovascular", weightPercent: 9, track: "lvn" },
    { systemId: "sys-2", systemName: "Respiratory", weightPercent: 11, track: "lvn" },
    { systemId: "sys-3", systemName: "Renal", weightPercent: 8, track: "lvn" },
    { systemId: "sys-4", systemName: "Psychiatric", weightPercent: 9, track: "lvn" },
    { systemId: "sys-5", systemName: "Pharmacology", weightPercent: 12, track: "lvn" },
    { systemId: "sys-6", systemName: "Maternal/Newborn", weightPercent: 10, track: "lvn" },
  ],
  rn: [
    { systemId: "sys-1", systemName: "Cardiovascular", weightPercent: 12, track: "rn" },
    { systemId: "sys-2", systemName: "Respiratory", weightPercent: 10, track: "rn" },
    { systemId: "sys-3", systemName: "Renal", weightPercent: 9, track: "rn" },
    { systemId: "sys-4", systemName: "Psychiatric", weightPercent: 11, track: "rn" },
    { systemId: "sys-5", systemName: "Pharmacology", weightPercent: 13, track: "rn" },
    { systemId: "sys-6", systemName: "Maternal/Newborn", weightPercent: 11, track: "rn" },
  ],
  fnp: [
    { systemId: "sys-1", systemName: "Cardiovascular", weightPercent: 14, track: "fnp" },
    { systemId: "sys-2", systemName: "Respiratory", weightPercent: 12, track: "fnp" },
    { systemId: "sys-3", systemName: "Renal", weightPercent: 8, track: "fnp" },
    { systemId: "sys-4", systemName: "Psychiatric", weightPercent: 10, track: "fnp" },
    { systemId: "sys-5", systemName: "Pharmacology", weightPercent: 15, track: "fnp" },
  ],
  pmhnp: [
    { systemId: "sys-1", systemName: "Cardiovascular", weightPercent: 5, track: "pmhnp" },
    { systemId: "sys-2", systemName: "Respiratory", weightPercent: 4, track: "pmhnp" },
    { systemId: "sys-3", systemName: "Renal", weightPercent: 4, track: "pmhnp" },
    { systemId: "sys-4", systemName: "Psychiatric/Mental Health", weightPercent: 45, track: "pmhnp" },
    { systemId: "sys-5", systemName: "Pharmacology", weightPercent: 20, track: "pmhnp" },
  ],
};

/** Topic-level blueprint (subset for mock) */
export const MOCK_TOPIC_BLUEPRINT: TopicBlueprintWeight[] = [
  { systemId: "sys-1", systemName: "Cardiovascular", topicId: "top-1", topicName: "Heart Failure", weightPercent: 5, track: "rn" },
  { systemId: "sys-1", systemName: "Cardiovascular", topicId: "top-2", topicName: "Arrhythmias", weightPercent: 4, track: "rn" },
  { systemId: "sys-2", systemName: "Respiratory", topicId: "top-3", topicName: "COPD", weightPercent: 5, track: "rn" },
  { systemId: "sys-3", systemName: "Renal", topicId: "top-4", topicName: "Acute Kidney Injury", weightPercent: 4, track: "rn" },
  { systemId: "sys-4", systemName: "Psychiatric", topicId: "top-5", topicName: "Depression", weightPercent: 5, track: "rn" },
];

/** Internal telemetry - most missed, slow, low-confidence */
export const MOCK_TELEMETRY: TelemetrySignal[] = [
  { entityType: "topic", entityId: "top-1", entityName: "Heart Failure", missRate: 42, totalAttempts: 1200 },
  { entityType: "topic", entityId: "top-2", entityName: "Arrhythmias", missRate: 48, totalAttempts: 980 },
  { entityType: "topic", entityId: "top-3", entityName: "COPD", missRate: 38, totalAttempts: 1100 },
  { entityType: "topic", entityId: "top-4", entityName: "Acute Kidney Injury", missRate: 55, totalAttempts: 650 },
  { entityType: "topic", entityId: "top-5", entityName: "Depression", missRate: 35, totalAttempts: 800 },
  { entityType: "skill", entityId: "skill-2", entityName: "Pharmacology", missRate: 52, totalAttempts: 900 },
  { entityType: "item_type", entityId: "dosage", entityName: "Dosage Calculation", missRate: 58, avgTimeSeconds: 95, totalAttempts: 400 },
  { entityType: "item_type", entityId: "multiple", entityName: "Multiple Response", missRate: 62, avgTimeSeconds: 72, totalAttempts: 350 },
];

/** Student signal - saved notes, issue reports, AI requests */
export const MOCK_STUDENT_SIGNAL: StudentSignal[] = [
  { entityType: "topic", entityId: "top-1", savedNotesCount: 340, explanationRequestsCount: 180, confusionTags: ["HFrEF vs HFpEF", "GDMT order"] },
  { entityType: "topic", entityId: "top-2", savedNotesCount: 210, explanationRequestsCount: 95, confusionTags: ["V-tach vs SVT", "adenosine timing"] },
  { entityType: "topic", entityId: "top-3", savedNotesCount: 280, explanationRequestsCount: 120, confusionTags: ["COPD vs asthma", "hypoxic drive"] },
  { entityType: "topic", entityId: "top-4", savedNotesCount: 150, explanationRequestsCount: 88, confusionTags: ["prerenal vs intrinsic", "BUN:Cr ratio"] },
  { entityType: "topic", entityId: "top-5", savedNotesCount: 190, explanationRequestsCount: 75, confusionTags: ["SSRI vs SNRI", "serotonin syndrome"] },
];

/** Top traps - common exam pitfalls */
export const MOCK_TOP_TRAPS = [
  { id: "trap-1", topicId: "top-3", topicName: "COPD", trapDescription: "Giving high-flow O2 to chronic CO2 retainers", correctApproach: "Use low-flow (2-4 L) or Venturi mask; high O2 suppresses hypoxic drive", track: "rn" as TrackSlug, frequency: "extremely_common" as const },
  { id: "trap-2", topicId: "top-1", topicName: "Heart Failure", trapDescription: "Confusing S3 (volume overload) with S4 (stiff ventricle)", correctApproach: "S3 = HF, volume overload; S4 = diastolic dysfunction, often HTN", track: "rn" as TrackSlug, frequency: "very_common" as const },
  { id: "trap-3", topicId: "top-4", topicName: "Acute Kidney Injury", trapDescription: "Assuming elevated BUN:Cr = intrinsic AKI", correctApproach: "BUN:Cr >20 suggests prerenal (hypovolemia, HF); <15 suggests intrinsic", track: "rn" as TrackSlug, frequency: "common" as const },
  { id: "trap-4", topicId: "top-2", topicName: "Arrhythmias", trapDescription: "Using adenosine for irregular wide-complex tachycardia", correctApproach: "Adenosine for regular SVT; avoid in irregular rhythms (could be A-fib)", track: "rn" as TrackSlug, frequency: "very_common" as const },
];

/** Common confusions - "students commonly confuse X with Y" */
export const MOCK_COMMON_CONFUSIONS = [
  { id: "conf-1", topicId: "top-1", topicName: "Heart Failure", conceptA: "HFrEF", conceptB: "HFpEF", keyDifference: "HFrEF = reduced EF (<40%); HFpEF = preserved EF, diastolic dysfunction. Different meds: HFrEF gets GDMT; HFpEF focuses on diuretics, BP control", track: "rn" as TrackSlug },
  { id: "conf-2", topicId: "top-3", topicName: "COPD", conceptA: "COPD", conceptB: "Asthma", keyDifference: "COPD: irreversible, smoking, chronic; Asthma: reversible, triggers, often younger. Treatment differs: COPD = bronchodilators + sometimes steroids; Asthma = controller + rescue", track: "rn" as TrackSlug },
  { id: "conf-3", topicId: "top-4", topicName: "Acute Kidney Injury", conceptA: "Prerenal AKI", conceptB: "Intrinsic AKI", keyDifference: "Prerenal: hypoperfusion, reversible with fluids; BUN:Cr >20. Intrinsic: tubular damage (ATN), nephrotoxins; BUN:Cr <15", track: "rn" as TrackSlug },
  { id: "conf-4", topicId: "top-5", topicName: "Depression", conceptA: "SSRI", conceptB: "SNRI", keyDifference: "SSRI = serotonin only (fluoxetine, sertraline). SNRI = serotonin + norepinephrine (venlafaxine, duloxetine). SNRI may help with pain; different side-effect profiles", track: "rn" as TrackSlug },
];
