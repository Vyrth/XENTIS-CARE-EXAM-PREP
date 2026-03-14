"use client";

/**
 * Exception badges for the review queue: triage-based labels derived from
 * routing_reason and review flags. Replaces "complete this manually" with
 * "review exception and decide."
 */

export type ExceptionBadgeType =
  | "duplicate_risk"
  | "needs_sme"
  | "missing_legal"
  | "weak_rationale"
  | "taxonomy_issue";

const BADGE_CONFIG: Record<
  ExceptionBadgeType,
  { label: string; className: string }
> = {
  duplicate_risk: {
    label: "Duplicate risk",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  },
  needs_sme: {
    label: "Needs SME validation",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  missing_legal: {
    label: "Missing legal clearance",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  weak_rationale: {
    label: "Weak rationale",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  taxonomy_issue: {
    label: "Taxonomy issue",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  },
};

function deriveBadgeTypes(
  routingReason: string | null | undefined,
  reviewFlags?: {
    requires_editorial_review?: boolean;
    requires_sme_review?: boolean;
    requires_legal_review?: boolean;
    requires_qa_review?: boolean;
  } | null
): ExceptionBadgeType[] {
  const out: ExceptionBadgeType[] = [];
  const r = (routingReason ?? "").toLowerCase();

  if (r.includes("duplicate") || r.includes("similarity")) out.push("duplicate_risk");
  if (
    r.includes("medical") ||
    r.includes("sme") ||
    r.includes("confidence") ||
    r.includes("human review") ||
    reviewFlags?.requires_sme_review
  ) {
    out.push("needs_sme");
  }
  if (
    r.includes("legal") ||
    r.includes("blocked") ||
    r.includes("pending_legal") ||
    r.includes("evidence") ||
    r.includes("source mapping") ||
    reviewFlags?.requires_legal_review
  ) {
    out.push("missing_legal");
  }
  if (
    r.includes("rationale") ||
    r.includes("schema") ||
    r.includes("validation") ||
    r.includes("editorial") ||
    r.includes("option") ||
    r.includes("stem") ||
    reviewFlags?.requires_editorial_review
  ) {
    out.push("weak_rationale");
  }
  if (
    r.includes("taxonomy") ||
    r.includes("render") ||
    r.includes("technical") ||
    r.includes("display") ||
    r.includes("format") ||
    r.includes("quality") ||
    reviewFlags?.requires_qa_review
  ) {
    out.push("taxonomy_issue");
  }

  return [...new Set(out)];
}

export interface RoutingReasonBadgesProps {
  routingReason?: string | null;
  reviewFlags?: {
    requires_editorial_review?: boolean;
    requires_sme_review?: boolean;
    requires_legal_review?: boolean;
    requires_qa_review?: boolean;
  } | null;
  /** Show only first N badges to keep the cell compact */
  maxBadges?: number;
}

export function RoutingReasonBadges({
  routingReason,
  reviewFlags,
  maxBadges = 4,
}: RoutingReasonBadgesProps) {
  const types = deriveBadgeTypes(routingReason, reviewFlags).slice(0, maxBadges);
  if (types.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => {
        const { label, className } = BADGE_CONFIG[t];
        return (
          <span
            key={t}
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${className}`}
            title={routingReason ?? undefined}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
