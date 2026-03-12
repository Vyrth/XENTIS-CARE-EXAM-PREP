import { redirect } from "next/navigation";

/**
 * /results/[resultId] redirects to breakdown.
 * Prevents dead-end when user lands on results root.
 */
export default async function ResultsRedirectPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  redirect(`/results/${resultId}/breakdown`);
}
