"use client";

import { useState, useEffect } from "react";
import type { ExamTrack } from "@/lib/ai/explain-highlight/types";

/** Returns user's primary track from profile. Null when no track set. */
export function useTrack(): ExamTrack | null {
  const [track, setTrack] = useState<ExamTrack | null>(null);
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.track && ["lvn", "rn", "fnp", "pmhnp"].includes(d.track)) {
          setTrack(d.track);
        } else {
          setTrack(null);
        }
      })
      .catch(() => setTrack(null));
  }, []);
  return track;
}
