/**
 * Map study guide sections to topics for high-yield flags
 * In production: store topicId on sections or use CMS metadata
 */

/** Get topic ID for a section (by title + system) */
export function getTopicIdForSection(sectionTitle: string, systemId?: string): string | null {
  if (sectionTitle === "Heart Failure Overview" || sectionTitle === "Assessment and Diagnosis" || sectionTitle === "Pharmacologic Management") return "top-1";
  if (sectionTitle === "COPD Overview") return "top-3";
  if (sectionTitle === "Management" && systemId === "sys-2") return "top-3";
  if (sectionTitle === "Management" && systemId === "sys-3") return "top-4";
  if (sectionTitle === "AKI Overview") return "top-4";
  if (sectionTitle === "Depression") return "top-5";
  if (sectionTitle === "Assessment" && systemId === "sys-4") return "top-5";
  if (sectionTitle.toLowerCase().includes("heart failure")) return "top-1";
  if (sectionTitle.toLowerCase().includes("arrhythmia")) return "top-2";
  if (sectionTitle.toLowerCase().includes("copd")) return "top-3";
  if (sectionTitle.toLowerCase().includes("aki") || sectionTitle.toLowerCase().includes("kidney")) return "top-4";
  if (sectionTitle.toLowerCase().includes("depression")) return "top-5";
  return null;
}
