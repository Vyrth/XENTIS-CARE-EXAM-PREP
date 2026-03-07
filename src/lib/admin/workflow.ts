import type { WorkflowStatus } from "@/types/admin";
import { STATUS_TRANSITIONS } from "@/types/admin";

/**
 * Check if a status transition is valid
 */
export function canTransition(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next statuses for a given current status
 */
export function getAllowedTransitions(from: WorkflowStatus): WorkflowStatus[] {
  return STATUS_TRANSITIONS[from] ?? [];
}
