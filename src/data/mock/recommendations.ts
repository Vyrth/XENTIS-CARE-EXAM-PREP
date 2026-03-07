import type { AdaptiveRecommendation } from "./types";

export const MOCK_RECOMMENDATIONS: AdaptiveRecommendation[] = [
  {
    id: "rec-1",
    type: "question",
    title: "Practice Cardiovascular Questions",
    description: "Your accuracy in Cardiovascular is 62%. Focus on heart failure and arrhythmias.",
    priority: "high",
    reason: "weak_system",
    href: "/questions?system=cardiovascular",
    entityId: "sys-1",
  },
  {
    id: "rec-2",
    type: "content",
    title: "Review Heart Failure Section",
    description: "You missed 2 questions on heart failure pharmacology.",
    priority: "high",
    reason: "repeated_miss",
    href: "/study-guides/cardiovascular#pharmacology",
    entityId: "sec-3",
  },
  {
    id: "rec-3",
    type: "exam",
    title: "Pre-Practice Exam",
    description: "You haven't taken a full-length exam this week.",
    priority: "medium",
    reason: "scheduled",
    href: "/pre-practice/rn",
  },
];
