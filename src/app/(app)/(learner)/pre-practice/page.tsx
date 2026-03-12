import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getPrimaryTrack } from "@/lib/auth/track";

export default async function PrePracticePage() {
  const user = await getSessionUser();
  const primary = await getPrimaryTrack(user?.id ?? null);
  const trackSlug = primary?.trackSlug ?? "rn";
  redirect(`/pre-practice/${trackSlug}`);
}
