import type { Note } from "./types";

export const MOCK_NOTES: Note[] = [
  {
    id: "n-1",
    content: "Heart failure: S3 gallop = volume overload. BNP elevated. Remember GDMT: ACE-I/ARNI, beta-blocker, MRA, SGLT2i.",
    contentRef: "study-guide-sec-1",
    createdAt: "2025-03-05T10:00:00Z",
  },
  {
    id: "n-2",
    content: "COPD: Don't give high O2 to chronic retainers - suppresses hypoxic drive. Use low-flow (2-4 L) or venturi mask.",
    contentRef: "question-q-2",
    createdAt: "2025-03-04T14:30:00Z",
  },
];
