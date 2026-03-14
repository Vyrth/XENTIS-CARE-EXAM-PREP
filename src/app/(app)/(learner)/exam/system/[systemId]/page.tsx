import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { canAccessSystemExams } from "@/lib/billing/entitlements";
import { loadSystemExamBySystemId } from "@/lib/exam/loaders";
import { loadQuestionIds } from "@/lib/questions/loaders";
import { SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS, SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS } from "@/config/exam";
import { SystemExamStartClient } from "./SystemExamStartClient";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";

type Props = { params: Promise<{ systemId: string }> };

export default async function SystemExamStartPage({ params }: Props) {
  const { systemId } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;

  if (!trackId) notFound();

  const canAccess = user ? await canAccessSystemExams(user.id) : false;
  if (!canAccess) {
    return (
      <div className="p-6 lg:p-8 max-w-xl mx-auto">
        <UpgradePrompt
          reason="System exams require a paid plan"
          usage="Unlock 50+ question system exams with Pro"
          variant="card"
        />
      </div>
    );
  }

  const [exam, questionIds] = await Promise.all([
    loadSystemExamBySystemId(trackId, systemId),
    loadQuestionIds(trackId, { systemId }, 100, 0),
  ]);

  if (!exam) notFound();

  const questionCount = questionIds.length;
  const canStart = questionCount >= SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS;

  return (
    <SystemExamStartClient
      systemId={systemId}
      systemName={exam.systemName}
      examName={exam.name}
      questionCount={questionCount}
      canStart={canStart}
      practiceMin={SYSTEM_EXAM_PRACTICE_MIN_QUESTIONS}
      idealMin={SYSTEM_EXAM_PRACTICE_IDEAL_QUESTIONS}
    />
  );
}
