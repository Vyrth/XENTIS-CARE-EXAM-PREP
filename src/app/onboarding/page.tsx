import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: tracks } = await supabase
    .from("exam_tracks")
    .select("id, slug, name")
    .order("display_order");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Set up your study plan
          </h1>
          <p className="mt-2 text-slate-600 text-sm">
            We&apos;ll personalize your experience
          </p>
        </div>

        <OnboardingForm tracks={tracks ?? []} />
      </div>
    </div>
  );
}
