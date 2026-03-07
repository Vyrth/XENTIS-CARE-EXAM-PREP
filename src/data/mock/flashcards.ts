import type { Flashcard } from "./types";

export const MOCK_FLASHCARD_DECKS = [
  { id: "deck-1", name: "Cardiovascular Key Terms", systemId: "sys-1", count: 12 },
  { id: "deck-2", name: "Respiratory Pharmacology", systemId: "sys-2", count: 8 },
  { id: "deck-3", name: "Psychiatric Diagnoses", systemId: "sys-4", count: 15 },
];

export const MOCK_FLASHCARDS: Flashcard[] = [
  { id: "fc-1", front: "What is the normal ejection fraction?", back: "55-70%. EF <40% indicates systolic heart failure.", deckId: "deck-1" },
  { id: "fc-2", front: "S3 gallop indicates?", back: "Ventricular volume overload; common in heart failure.", deckId: "deck-1" },
  { id: "fc-3", front: "BNP level >100 pg/mL suggests?", back: "Heart failure. Levels correlate with severity.", deckId: "deck-1" },
  { id: "fc-4", front: "First-line bronchodilator for COPD?", back: "Short-acting beta-2 agonist (albuterol) for rescue. LABA + LAMA for maintenance.", deckId: "deck-2" },
  { id: "fc-5", front: "Major depressive disorder requires how many symptoms for 2+ weeks?", back: "5 or more, including depressed mood or anhedonia.", deckId: "deck-3" },
];
