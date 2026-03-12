"use client";

import { useState, useCallback } from "react";
import { StatusTransitionButton } from "./StatusTransitionButton";
import { transitionContentStatus } from "@/app/(app)/actions/content-review";
import type { WorkflowStatus } from "@/types/admin";

export interface ContentStatusTransitionFormProps {
  entityType: string;
  entityId: string;
  currentStatus: WorkflowStatus;
  userId: string | null;
  onTransitioned?: () => void;
}

export function ContentStatusTransitionForm({
  entityType,
  entityId,
  currentStatus,
  userId,
  onTransitioned,
}: ContentStatusTransitionFormProps) {
  const [blockPublishReason, setBlockPublishReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTransition = useCallback(
    async (to: WorkflowStatus) => {
      setError(null);
      setBlockPublishReason(null);
      const r = await transitionContentStatus(entityType, entityId, to, userId);
      if (r.success) {
        onTransitioned?.();
        if (typeof window !== "undefined") window.location.reload();
      } else {
        if (r.blockPublishReason) {
          setBlockPublishReason(r.blockPublishReason);
        } else {
          setError(r.error ?? "Transition failed");
        }
      }
    },
    [entityType, entityId, userId, onTransitioned]
  );

  return (
    <div className="space-y-2">
      <StatusTransitionButton
        currentStatus={currentStatus}
        onTransition={handleTransition}
        blockPublishReason={blockPublishReason}
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
