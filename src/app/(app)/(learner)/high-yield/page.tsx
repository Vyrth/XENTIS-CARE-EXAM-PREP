import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";
import { HighYieldPageClient } from "./HighYieldPageClient";
import { loadHighYieldFeed } from "@/lib/high-yield";

export default async function HighYieldPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const track = primary?.trackSlug ?? "rn";
  const trackId = primary?.trackId ?? null;

  const feed = await loadHighYieldFeed(trackId, track, 15);
  const guideBySystemObj = Object.fromEntries(feed.guideBySystem);

  return (
    <HighYieldPageClient
      track={track}
      topics={feed.topics}
      traps={feed.traps}
      confusions={feed.confusions}
      guideBySystem={guideBySystemObj}
    />
  );
}
