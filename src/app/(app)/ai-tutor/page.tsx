import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { AITutorPageClient } from "./AITutorPageClient";
import { rollupBySystem, rollupByDomain, getWeakRollups } from "@/lib/readiness";
import { loadMasteryData, loadStudyWorkflowRecommendations } from "@/lib/dashboard/loaders";

export default async function AITutorPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackId = primary?.trackId ?? null;
  const track = primary?.trackSlug ?? "rn";
  const [mastery, nextStepSuggestions] = await Promise.all([
    loadMasteryData(user?.id ?? null, trackId),
    loadStudyWorkflowRecommendations(user?.id ?? null, trackId, track),
  ]);
  const systemRollups = rollupBySystem(mastery.systems);
  const domainRollups = rollupByDomain(mastery.domains);
  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);

  const weakAreas = {
    systems: weakSystems.map((s) => s.name),
    domains: weakDomains.map((d) => d.name),
  };

  return (
    <AITutorPageClient
      track={track}
      weakAreas={weakAreas}
      nextStepSuggestions={nextStepSuggestions}
    />
  );
}
