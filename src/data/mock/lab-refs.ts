import type { LabReference } from "./types";

export const MOCK_LAB_REFERENCES: LabReference[] = [
  { id: "lab-1", name: "Hemoglobin", abbreviation: "Hgb", unit: "g/dL", low: 12, high: 16, set: "cbc" },
  { id: "lab-2", name: "Hematocrit", abbreviation: "Hct", unit: "%", low: 36, high: 46, set: "cbc" },
  { id: "lab-3", name: "WBC", abbreviation: "WBC", unit: "x10³/µL", low: 4.5, high: 11, set: "cbc" },
  { id: "lab-4", name: "Platelets", unit: "x10³/µL", low: 150, high: 400, set: "cbc" },
  { id: "lab-5", name: "Sodium", abbreviation: "Na", unit: "mEq/L", low: 136, high: 145, set: "bmp" },
  { id: "lab-6", name: "Potassium", abbreviation: "K", unit: "mEq/L", low: 3.5, high: 5, set: "bmp" },
  { id: "lab-7", name: "Glucose", unit: "mg/dL", low: 70, high: 100, set: "bmp" },
  { id: "lab-8", name: "BUN", unit: "mg/dL", low: 7, high: 20, set: "bmp" },
  { id: "lab-9", name: "Creatinine", unit: "mg/dL", low: 0.7, high: 1.3, set: "bmp" },
  { id: "lab-10", name: "INR", unit: "", low: 0.8, high: 1.2, set: "coag" },
  { id: "lab-11", name: "PT", abbreviation: "PT", unit: "seconds", low: 11, high: 13.5, set: "coag" },
];

export const LAB_SETS = [
  { id: "cbc", name: "Complete Blood Count" },
  { id: "bmp", name: "Basic Metabolic Panel" },
  { id: "coag", name: "Coagulation" },
];
