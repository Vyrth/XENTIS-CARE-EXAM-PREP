import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { loadStudyGuideById } from "@/lib/content";
import { loadHighYieldTopics } from "@/lib/dashboard/loaders";
import { StudyGuideReaderClient } from "./StudyGuideReaderClient";

type Props = { params: Promise<{ guideId: string }> };

export default async function StudyGuideDetailPage({ params }: Props) {
  const { guideId } = await params;
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";

  const [guide, hyTopics] = await Promise.all([
    loadStudyGuideById(trackId, guideId),
    trackId ? loadHighYieldTopics(trackId, track, 200) : Promise.resolve([]),
  ]);

  const hyScoreByTopic = new Map<string, number>();
  hyTopics.forEach((t) => hyScoreByTopic.set(t.topicId, t.score));

  if (!guide) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Study guide not found.</p>
        <Link href="/study-guides" className="text-indigo-600 mt-4 inline-block">
          Back to Study Guides
        </Link>
      </div>
    );
  }

  return <StudyGuideReaderClient guide={guide} hyScoreByTopic={hyScoreByTopic} />;
}
