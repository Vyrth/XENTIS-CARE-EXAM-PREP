export const MOCK_PERFORMANCE_BY_SYSTEM = [
  { systemId: "sys-1", name: "Cardiovascular", score: 62, questions: 45, target: 80 },
  { systemId: "sys-2", name: "Respiratory", score: 78, questions: 32, target: 80 },
  { systemId: "sys-3", name: "Renal", score: 55, questions: 28, target: 80 },
  { systemId: "sys-4", name: "Psychiatric", score: 82, questions: 40, target: 80 },
];

export const MOCK_PERFORMANCE_BY_DOMAIN = [
  { domainId: "dom-1", name: "Safe and Effective Care", score: 68 },
  { domainId: "dom-2", name: "Health Promotion", score: 72 },
  { domainId: "dom-3", name: "Psychosocial Integrity", score: 75 },
];

export const MOCK_CONFIDENCE_DATA = [
  { range: "0-25%", correct: 12, total: 15, calibrated: false },
  { range: "26-50%", correct: 18, total: 25, calibrated: false },
  { range: "51-75%", correct: 45, total: 50, calibrated: true },
  { range: "76-100%", correct: 38, total: 40, calibrated: true },
];
