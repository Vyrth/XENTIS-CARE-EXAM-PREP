"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getPublishGateStatus } from "@/app/(app)/actions/content-review";
import { Icons } from "@/components/ui/icons";

export interface ReviewCheckPanelProps {
  entityType: string;
  entityId: string;
}

export function ReviewCheckPanel({ entityType, entityId }: ReviewCheckPanelProps) {
  const [gate, setGate] = useState<{ canPublish: boolean; missingStages: string[] } | null>(null);

  useEffect(() => {
    getPublishGateStatus(entityType, entityId).then(setGate);
  }, [entityType, entityId]);

  if (!gate) return null;

  return (
    <Card>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
        {Icons.shield} Publish Requirements
      </h3>
      {gate.canPublish ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          All required approvals complete. Ready to publish.
        </p>
      ) : (
        <div>
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
            Missing required approvals:
          </p>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            {gate.missingStages.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="text-amber-500">•</span> {s}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            Content must pass through each review stage before publishing.
          </p>
        </div>
      )}
    </Card>
  );
}
