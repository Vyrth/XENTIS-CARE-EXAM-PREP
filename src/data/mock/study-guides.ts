import type { StudyGuideSection } from "./types";

export type StudyGuide = { id: string; title: string; systemId: string; sections: StudyGuideSection[] };

export const MOCK_STUDY_GUIDE: StudyGuide = {
  id: "sg-1",
  title: "Cardiovascular System",
  systemId: "sys-1",
  sections: [
    {
      id: "sec-1",
      title: "Heart Failure Overview",
      order: 1,
      content: `
Heart failure (HF) is a clinical syndrome in which the heart is unable to pump sufficient blood to meet the body's metabolic demands. It can result from systolic dysfunction (reduced ejection fraction), diastolic dysfunction (impaired filling), or both.

**Key Concepts:**
- **Systolic HF (HFrEF):** EF <40%. The heart cannot contract effectively. Common causes: MI, cardiomyopathy, valvular disease.
- **Diastolic HF (HFpEF):** EF ≥50%. The heart cannot relax and fill properly. Common in hypertension, obesity, diabetes.
- **Compensatory mechanisms** (initially helpful, eventually harmful): RAAS activation, SNS activation, ventricular remodeling.

**Staging (ACC/AHA):**
- Stage A: At risk, no structural disease
- Stage B: Structural disease, no symptoms
- Stage C: Structural disease, current or prior symptoms
- Stage D: Refractory HF requiring specialized interventions
`,
    },
    {
      id: "sec-2",
      title: "Assessment and Diagnosis",
      order: 2,
      content: `
**Signs and Symptoms:**
- Left-sided: Dyspnea, orthopnea, PND, crackles, S3 gallop
- Right-sided: JVD, peripheral edema, hepatomegaly, ascites
- General: Fatigue, exercise intolerance

**Diagnostic Tests:**
- BNP/NT-proBNP: Elevated in HF; used for diagnosis and prognosis
- Echocardiogram: Gold standard for EF and structure
- Chest X-ray: Cardiomegaly, pulmonary congestion
- ECG: May show underlying cause (e.g., prior MI, arrhythmia)
`,
    },
    {
      id: "sec-3",
      title: "Pharmacologic Management",
      order: 3,
      content: `
**HFrEF (reduced EF) - Guideline-Directed Medical Therapy (GDMT):**
1. **ACE-I or ARB or ARNI:** Reduce afterload, improve remodeling. Sacubitril/valsartan (ARNI) preferred over ACE-I in eligible patients.
2. **Beta-blockers:** Carvedilol, metoprolol, bisoprolol. Start low, titrate to target.
3. **MRAs:** Spironolactone or eplerenone. Monitor K+ and renal function.
4. **SGLT2 inhibitors:** Dapagliflozin, empagliflozin. Now recommended for all HFrEF regardless of diabetes status.
5. **Diuretics:** For fluid overload. Loop diuretics (furosemide) first line.

**HFpEF:** Fewer evidence-based options. Focus on BP control, diuretics for congestion, treat comorbidities.
`,
    },
  ],
};

export const MOCK_STUDY_GUIDES: StudyGuide[] = [
  MOCK_STUDY_GUIDE,
  {
    id: "sg-2",
    title: "Respiratory System",
    systemId: "sys-2",
    sections: [
      { id: "sec-r1", title: "COPD Overview", order: 1, content: "**COPD** includes emphysema and chronic bronchitis. Key concepts: hypoxic drive, oxygen-induced hypoventilation, bronchodilators." },
      { id: "sec-r2", title: "Management", order: 2, content: "Short-acting beta-2 agonists for rescue. LABA + LAMA for maintenance. Avoid high-flow O2 in chronic retainers." },
    ],
  },
  {
    id: "sg-3",
    title: "Renal System",
    systemId: "sys-3",
    sections: [
      { id: "sec-k1", title: "AKI Overview", order: 1, content: "**Acute Kidney Injury** - prerenal, intrarenal, postrenal causes. Monitor BUN/Cr, urine output, electrolytes." },
      { id: "sec-k2", title: "Management", order: 2, content: "Address underlying cause. Fluid management. Avoid nephrotoxins. Dialysis for severe cases." },
    ],
  },
  {
    id: "sg-4",
    title: "Psychiatric System",
    systemId: "sys-4",
    sections: [
      { id: "sec-p1", title: "Depression", order: 1, content: "**Major depressive disorder** - 5+ symptoms for 2+ weeks. PHQ-9 screening. SSRIs first line." },
      { id: "sec-p2", title: "Assessment", order: 2, content: "Assess SI, sleep, appetite, energy. Rule out medical causes (TSH, B12)." },
    ],
  },
];
