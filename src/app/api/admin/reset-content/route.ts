import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_ROUTES } from "@/config/admin-routes";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseServiceRoleConfigured } from "@/lib/supabase/env";

/**
 * POST /api/admin/reset-content
 * Admin-only. Executes Phase 8 safe reset (content, progress, sessions).
 * Preserves taxonomy, configs, auth.
 * Body: { includeAiJobs?: boolean } - default true. Set false to keep AI jobs/campaigns/dedupe.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "Service role not configured. Cannot perform reset." },
      { status: 500 }
    );
  }

  let includeAiJobs = true;
  try {
    const body = await req.json().catch(() => ({}));
    includeAiJobs = body.includeAiJobs !== false;
  } catch {
    // use default
  }

  const supabase = createServiceClient();

  try {
    const { error } = await supabase.rpc("admin_reset_content_zero", {
      p_include_ai_jobs: includeAiJobs,
    });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[reset-content] RPC failed:", error);
      }
      return NextResponse.json(
        { error: error.message ?? "Reset failed" },
        { status: 500 }
      );
    }

    // Revalidate admin and learner pages so counts show 0 / empty states
    revalidatePath(ADMIN_ROUTES.OVERVIEW);
    revalidatePath(ADMIN_ROUTES.REVIEW_QUEUE);
    revalidatePath(ADMIN_ROUTES.PUBLISH_QUEUE);
    revalidatePath(ADMIN_ROUTES.CONTENT_INVENTORY);
    revalidatePath(ADMIN_ROUTES.AI_FACTORY);
    revalidatePath("/questions");
    revalidatePath("/study-guides");
    revalidatePath("/flashcards");
    revalidatePath("/videos");
    revalidatePath("/high-yield");
    revalidatePath("/dashboard");
    revalidatePath("/progress");
    revalidatePath("/weak-areas");
    revalidatePath("/strength-report");
    revalidatePath("/confidence-calibration");
    revalidatePath("/practice");
    revalidatePath("/topics");

    return NextResponse.json({ success: true });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[reset-content] error", err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 }
    );
  }
}
