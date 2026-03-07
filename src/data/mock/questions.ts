import type { Question } from "./types";

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "q-1",
    stem: "A 65-year-old patient with a history of hypertension presents with chest pain radiating to the left arm. Vital signs: BP 90/60, HR 110, RR 24. Which nursing action is the priority?",
    type: "single_best_answer",
    systemId: "sys-1",
    domainId: "dom-1",
    options: [
      { key: "A", text: "Administer nitroglycerin sublingually" },
      { key: "B", text: "Obtain a 12-lead ECG within 10 minutes" },
      { key: "C", text: "Place patient in high Fowler's position" },
      { key: "D", text: "Start an IV and draw cardiac enzymes" },
    ],
    correctAnswer: "B",
    rationale:
      "For suspected acute coronary syndrome (ACS), the priority is to obtain a 12-lead ECG within 10 minutes of arrival to identify ST-elevation MI (STEMI) and guide treatment. Nitroglycerin may be given after ECG if no contraindications. IV access and cardiac enzymes are important but the ECG drives immediate intervention decisions.",
  },
  {
    id: "q-2",
    stem: "A patient with COPD is receiving supplemental oxygen at 4 L/min via nasal cannula. The nurse notes the patient's respiratory rate has decreased from 24 to 12/min and the patient is increasingly drowsy. What is the most likely cause?",
    type: "single_best_answer",
    systemId: "sys-2",
    domainId: "dom-1",
    options: [
      { key: "A", text: "Oxygen-induced hypoventilation (CO2 narcosis)" },
      { key: "B", text: "Pneumonia" },
      { key: "C", text: "Pulmonary embolism" },
      { key: "D", text: "Anxiety reduction" },
    ],
    correctAnswer: "A",
    rationale:
      "In COPD patients with chronic hypercapnia, high-flow oxygen can suppress the hypoxic drive to breathe, leading to oxygen-induced hypoventilation and CO2 narcosis. The respiratory center becomes less responsive to elevated CO2 and relies on low O2 to stimulate breathing. Reducing oxygen flow and monitoring is indicated.",
  },
  {
    id: "q-3",
    stem: "A 45-year-old patient presents with acute onset of severe flank pain and hematuria. CT scan shows a 6mm kidney stone in the ureter. Which intervention should the nurse anticipate first?",
    type: "single_best_answer",
    systemId: "sys-3",
    domainId: "dom-1",
    options: [
      { key: "A", text: "Lithotripsy" },
      { key: "B", text: "Ureteroscopy with stone extraction" },
      { key: "C", text: "Pain management and increased fluid intake" },
      { key: "D", text: "Nephrostomy tube placement" },
    ],
    correctAnswer: "C",
    rationale:
      "Stones <10mm often pass spontaneously. Initial management focuses on pain control (NSAIDs, opioids) and hydration to facilitate passage. Invasive procedures are reserved for larger stones, obstruction, infection, or failure of conservative management.",
  },
];

export const MOCK_IMAGE_QUESTION: Question = {
  id: "q-img-1",
  stem: "Based on the ECG rhythm strip below, what is the appropriate immediate intervention?",
  type: "image_based",
  systemId: "sys-1",
  domainId: "dom-1",
  imageUrl: "/placeholder-ecg.svg",
  options: [
    { key: "A", text: "Adenosine 6mg IV push" },
    { key: "B", text: "Synchronized cardioversion" },
    { key: "C", text: "Amiodarone 150mg IV" },
    { key: "D", text: "Vagal maneuvers" },
  ],
  correctAnswer: "B",
  rationale:
    "The rhythm strip shows ventricular tachycardia (wide QRS, regular, rate >100). In a stable patient, amiodarone may be used. In unstable patients (hypotension, chest pain, etc.), synchronized cardioversion is the treatment of choice.",
};

export const MOCK_CASE_STUDY_QUESTION: Question = {
  id: "q-cs-1",
  stem: "Based on the case study, what is the most appropriate nursing diagnosis for this patient?",
  type: "case_study",
  systemId: "sys-4",
  domainId: "dom-3",
  caseStudyTabs: [
    {
      id: "tab-1",
      title: "History",
      content:
        "Ms. Johnson, 52, is admitted for evaluation of depressed mood. She reports low energy, poor sleep, and loss of interest in activities for the past 6 weeks. She has a history of major depressive disorder, last episode 3 years ago. Current medications: Sertraline 100mg daily, which she reports taking inconsistently.",
    },
    {
      id: "tab-2",
      title: "Assessment",
      content:
        "Flat affect, psychomotor retardation, poor eye contact. PHQ-9 score: 18 (moderately severe). Denies SI. Sleeps 4-5 hours, early morning awakening. Appetite decreased, 5 lb weight loss in 6 weeks. No psychosis.",
    },
    {
      id: "tab-3",
      title: "Labs",
      content:
        "TSH: 2.1 (normal), B12: 450 (normal), CBC and metabolic panel within normal limits. No recent substance use per patient and family.",
    },
  ],
  options: [
    { key: "A", text: "Risk for self-harm" },
    { key: "B", text: "Chronic low self-esteem" },
    { key: "C", text: "Ineffective coping" },
    { key: "D", text: "Hopelessness" },
  ],
  correctAnswer: "D",
  rationale:
    "Hopelessness is supported by the patient's flat affect, loss of interest, and depressive symptoms. While risk for self-harm should be assessed, she denies SI. Chronic low self-esteem and ineffective coping are less specific to the presentation. Hopelessness is a NANDA diagnosis commonly associated with depression.",
};
