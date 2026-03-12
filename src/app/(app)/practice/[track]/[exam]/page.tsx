import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadSystemExams } from "@/lib/exam/loaders";

type Props = { params: Promise<{ track: string; exam: string }> };

/**
 * Legacy route: /practice/{track}/{exam} (e.g. /practice/rn/cardiovascular).
 * Redirects to the real system exam start page.
 */
export default async function PracticeExamRedirectPage({ params }: Props) {
  const { track: paramTrack, exam: examSlug } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;

  if (!trackId) redirect("/practice");

  const exams = await loadSystemExams(trackId);
  const normalized = examSlug?.toLowerCase().replace(/\s+/g, "-");
  const match = exams.find(
    (e) =>
      e.systemSlug === normalized ||
      e.name.toLowerCase().replace(/\s+/g, "-").startsWith(normalized ?? "")
  );

  if (match) {
    redirect(`/exam/system/${match.systemId}`);
  }

  redirect(`/practice/${paramTrack}`);
}
