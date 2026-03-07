"use client";

import { useState, useEffect } from "react";
import type { ExamTrack } from "@/lib/ai/explain-highlight/types";

export function useTrack(): ExamTrack {
  const [track, setTrack] = useState<ExamTrack>("rn");
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.track && ["lvn", "rn", "fnp", "pmhnp"].includes(d.track)) {
          setTrack(d.track);
        }
      })
      .catch(() => {});
  }, []);
  return track;
}
