import { getSessionUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/profile";
import { AITutorPageClient } from "./AITutorPageClient";
import { rollupBySystem, rollupByDomain, getWeakRollups } from "@/lib/readiness";
import { MOCK_RAW_SYSTEM_PERFORMANCE, MOCK_RAW_DOMAIN_PERFORMANCE } from "@/data/mock/readiness";
import { MOCK_SYSTEMS, MOCK_DOMAINS } from "@/data/mock/systems";

/** Map profile exam_track_id to slug - mock mapping */
function trackIdToSlug(trackId: string | null): "lvn" | "rn" | "fnp" | "pmhnp" {
  if (!trackId) return "rn";
  const map: Record<string, "lvn" | "rn" | "fnp" | "pmhnp"> = {
    lvn: "lvn",
    rn: "rn",
    fnp: "fnp",
    pmhnp: "pmhnp",
  };
  return map[trackId] ?? "rn";
}

export default async function AITutorPage() {
  const user = await getSessionUser();
  const profile = user ? await getProfile(user.id) : null;
  const track = trackIdToSlug(profile?.primary_exam_track_id ?? null);

  const systemRollups = rollupBySystem(MOCK_RAW_SYSTEM_PERFORMANCE);
  const domainRollups = rollupByDomain(MOCK_RAW_DOMAIN_PERFORMANCE);
  const weakSystems = getWeakRollups(systemRollups);
  const weakDomains = getWeakRollups(domainRollups);

  const weakAreas = {
    systems: weakSystems.map((s) => MOCK_SYSTEMS.find((x) => x.id === s.id.replace("system-", ""))?.name ?? s.name),
    domains: weakDomains.map((d) => MOCK_DOMAINS.find((x) => x.id === d.id.replace("domain-", ""))?.name ?? d.name),
  };

  return (
    <AITutorPageClient
      track={track}
      weakAreas={weakAreas}
    />
  );
}
