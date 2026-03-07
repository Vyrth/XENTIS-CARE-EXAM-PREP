import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { completeOnboarding } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    exam_track_id?: string;
    target_exam_date?: string;
    study_minutes_per_day?: number;
    preferred_study_mode?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { exam_track_id, target_exam_date, study_minutes_per_day, preferred_study_mode } = body;

  if (
    !exam_track_id ||
    !target_exam_date ||
    typeof study_minutes_per_day !== "number" ||
    !preferred_study_mode
  ) {
    return NextResponse.json(
      { error: "Missing required fields: exam_track_id, target_exam_date, study_minutes_per_day, preferred_study_mode" },
      { status: 400 }
    );
  }

  if (study_minutes_per_day < 15 || study_minutes_per_day > 480) {
    return NextResponse.json(
      { error: "study_minutes_per_day must be between 15 and 480" },
      { status: 400 }
    );
  }

  const { error } = await completeOnboarding(user.id, {
    exam_track_id,
    target_exam_date,
    study_minutes_per_day,
    preferred_study_mode,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Failed to save onboarding" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
