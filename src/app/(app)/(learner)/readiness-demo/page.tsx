/**
 * Readiness Demo - deprecated.
 * Previously used mock data for demonstration. All readiness metrics now come from
 * real DB data on the Dashboard. Redirect to dashboard.
 */

import { redirect } from "next/navigation";

export default function ReadinessDemoPage() {
  redirect("/dashboard");
}
