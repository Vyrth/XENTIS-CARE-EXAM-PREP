import type { System, Domain, Topic } from "./types";

export const MOCK_SYSTEMS: System[] = [
  { id: "sys-1", slug: "cardiovascular", name: "Cardiovascular", track: "rn" },
  { id: "sys-2", slug: "respiratory", name: "Respiratory", track: "lvn" },
  { id: "sys-3", slug: "renal", name: "Renal", track: "fnp" },
  { id: "sys-4", slug: "psychiatric", name: "Psychiatric", track: "pmhnp" },
];

export const MOCK_DOMAINS: Domain[] = [
  { id: "dom-1", slug: "safe-care", name: "Safe and Effective Care" },
  { id: "dom-2", slug: "health-promo", name: "Health Promotion" },
  { id: "dom-3", slug: "psychosocial", name: "Psychosocial Integrity" },
];

export const MOCK_TOPICS: Topic[] = [
  { id: "top-1", slug: "heart-failure", name: "Heart Failure", systemId: "sys-1", domainId: "dom-1" },
  { id: "top-2", slug: "arrhythmias", name: "Arrhythmias", systemId: "sys-1", domainId: "dom-1" },
  { id: "top-3", slug: "copd", name: "COPD", systemId: "sys-2", domainId: "dom-1" },
  { id: "top-4", slug: "aki", name: "Acute Kidney Injury", systemId: "sys-3", domainId: "dom-1" },
  { id: "top-5", slug: "depression", name: "Depression", systemId: "sys-4", domainId: "dom-3" },
];
