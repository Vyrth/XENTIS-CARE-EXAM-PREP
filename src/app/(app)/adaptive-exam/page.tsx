import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { createServiceClient } from "@/lib/supabase/service";
import { AdaptiveLaunchCard } from "@/components/adaptive";
import { getTrackDisplayName } from "@/lib/auth/track";

export default async function AdaptiveExamLaunchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const primary = await getPrimaryTrack(user.id);
  if (!primary?.trackId) redirect("/onboarding");

  const supabase = createServiceClient();
  const { data: configs } = await supabase
    .from("adaptive_exam_configs")
    .select("id, slug, name, description, min_questions, max_questions, target_standard_error, passing_theta")
    .eq("exam_track_id", primary.trackId)
    .order("slug", { ascending: true })
    .limit(5);

  const config = configs?.[0];
  if (!config) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Adaptive NCLEX Exam
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          No adaptive exam config available for your track yet. Check back soon.
        </p>
      </div>
    );
  }

  const trackName = getTrackDisplayName(primary.trackSlug);

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Adaptive NCLEX Exam
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Computerized adaptive testing (CAT) that adapts to your ability level.
      </p>
      <AdaptiveLaunchCard
        trackName={trackName}
        trackId={primary.trackId}
        config={{
          id: config.id,
          slug: config.slug,
          name: config.name,
          description: config.description,
          minQuestions: config.min_questions ?? 75,
          maxQuestions: config.max_questions ?? 150,
          targetStandardError: Number(config.target_standard_error ?? 0.3),
          passingTheta: Number(config.passing_theta ?? 0),
        }}
      />
    </div>
  );
}
