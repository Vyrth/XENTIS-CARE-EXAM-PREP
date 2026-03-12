import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";

/**
 * System exams are track-specific. Redirect to practice page for user's track.
 */
export default async function SystemExamListPage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackSlug = primary?.trackSlug ?? "rn";
  redirect(`/practice/${trackSlug}`);
}
