"use client";

import { Card } from "@/components/ui/Card";
import type { ContentEvidenceMetadata } from "@/lib/admin/source-governance";

export interface EvidenceSourceGovernancePanelProps {
  contentType: string;
  contentId: string;
  metadata: ContentEvidenceMetadata | null;
  sourceFrameworkName?: string | null;
  primarySourceName?: string | null;
  guidelineSourceName?: string | null;
}

export function EvidenceSourceGovernancePanel({
  metadata,
  sourceFrameworkName,
  primarySourceName,
  guidelineSourceName,
}: EvidenceSourceGovernancePanelProps) {
  const hasMapping =
    metadata?.primaryReferenceId ||
    (metadata?.sourceSlugs && metadata.sourceSlugs.length > 0) ||
    primarySourceName;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        Evidence Source Governance
      </h3>
      <div className="space-y-2 text-sm">
        {!hasMapping ? (
          <p className="text-amber-600 dark:text-amber-500">
            No source mapping. Auto-publish requires primary_reference or source_slugs from approved
            sources.
          </p>
        ) : (
          <>
            {sourceFrameworkName && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Framework:</span>{" "}
                {sourceFrameworkName}
              </div>
            )}
            {primarySourceName && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Primary reference:</span>{" "}
                {primarySourceName}
              </div>
            )}
            {guidelineSourceName && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Guideline reference:</span>{" "}
                {guidelineSourceName}
              </div>
            )}
            {metadata?.evidenceTier != null && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Evidence tier:</span>{" "}
                {metadata.evidenceTier} (1=test plan, 2=textbook, 3=guideline)
              </div>
            )}
            {metadata?.sourceSlugs && metadata.sourceSlugs.length > 0 && (
              <div>
                <span className="text-slate-500 dark:text-slate-400">Source slugs:</span>{" "}
                {metadata.sourceSlugs.join(", ")}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
