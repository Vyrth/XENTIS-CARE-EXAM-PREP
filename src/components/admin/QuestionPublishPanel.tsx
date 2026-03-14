"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  getQuestionPublishEligibility,
  transitionContentStatus,
  type PublishBlocker,
  type PublishBlockerType,
} from "@/app/(app)/actions/content-review";
import { canTransition } from "@/lib/admin/workflow";
import type { WorkflowStatus } from "@/types/admin";

const BLOCKER_LABELS: Record<PublishBlockerType, string> = {
  legal_status: "Legal / source",
  review_lane: "Review approvals",
  duplicate_risk: "Duplicate risk",
  schema: "Schema / validation",
  quality: "Quality threshold",
};

export interface QuestionPublishPanelProps {
  questionId: string;
  /** Whether this question was created by AI factory (show Regenerate) */
  isAIGenerated?: boolean;
}

export function QuestionPublishPanel({
  questionId,
  isAIGenerated = false,
}: QuestionPublishPanelProps) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<Awaited<ReturnType<typeof getQuestionPublishEligibility>>>(null);
  const [publishing, setPublishing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    getQuestionPublishEligibility(questionId).then(setEligibility);
  };

  useEffect(() => {
    load();
  }, [questionId]);

  const handlePublish = async () => {
    if (!eligibility?.canPublish) return;
    setError(null);
    setPublishing(true);
    try {
      const r = await transitionContentStatus("question", questionId, "published", null, "Published from question detail");
      if (r.success) {
        router.refresh();
        load();
      } else {
        setError(r.error ?? r.blockPublishReason ?? "Publish failed");
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleRegenerate = async () => {
    setError(null);
    setRegenerating(true);
    try {
      const r = await transitionContentStatus(
        "question",
        questionId,
        "draft",
        null,
        "Sent back for regeneration (no manual rewrite required)"
      );
      if (r.success) {
        router.refresh();
        load();
      } else {
        setError(r.error ?? "Transition failed");
      }
    } finally {
      setRegenerating(false);
    }
  };

  if (!eligibility) return null;

  const showPublish = eligibility.canTransitionToPublished;
  const showRegenerate =
    isAIGenerated && canTransition(eligibility.currentStatus, "draft");
  const isPublished = eligibility.currentStatus === "published";

  return (
    <Card>
      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
        Publish
      </h3>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
      )}

      {isPublished ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          This question is published.
        </p>
      ) : eligibility.canPublish ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            All checks passed. Ready to publish.
          </p>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Resolve the following before publishing:
          </p>
          {eligibility.blockers.length === 0 ? (
            <p className="text-xs text-slate-500">
              No blockers from quality metadata. Complete review stages and source/legal if required.
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {eligibility.blockers.map((b) => (
                  <BlockerItem key={`${b.type}-${b.message}`} blocker={b} />
                ))}
              </ul>
              {showPublish && (
                <p className="text-xs text-slate-500">
                  After resolving blockers, save and refresh to re-check eligibility.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {showRegenerate && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
            title="Send back for regeneration without manual rewrite"
          >
            {regenerating ? "Sending…" : "Regenerate"}
          </button>
          <p className="text-xs text-slate-500 mt-1">
            Send this question back to draft for AI regeneration.
          </p>
        </div>
      )}
    </Card>
  );
}

function BlockerItem({ blocker }: { blocker: PublishBlocker }) {
  const label = BLOCKER_LABELS[blocker.type];
  return (
    <li className="flex gap-2 text-sm">
      <span className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden>
        •
      </span>
      <span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}:
        </span>{" "}
        <span className="text-slate-600 dark:text-slate-400">{blocker.message}</span>
      </span>
    </li>
  );
}
