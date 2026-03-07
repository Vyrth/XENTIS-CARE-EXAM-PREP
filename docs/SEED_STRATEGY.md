# Seed Data Strategy

## Overview

The platform uses a two-phase seed approach:

1. **Content seed** (SQL) — Taxonomy, questions, study guides, flashcards, videos, AI templates
2. **User seed** (TypeScript) — Readiness snapshots, adaptive queues, exam sessions (requires signed-in user)

## Content Seed (`supabase/seed.sql` + `seed_extended.sql`)

Runs automatically with `supabase db reset` or `npm run db:seed`.

### What Gets Seeded

| Category | Content |
|----------|---------|
| **Tracks** | LVN, RN, FNP, PMHNP |
| **Domains** | Safe Care, Health Promotion, Psychosocial, Physiological |
| **Systems** | Cardiovascular, Respiratory, Renal, Psychiatric (per track) |
| **Topics** | Heart Failure, Arrhythmias, COPD, AKI, Depression |
| **Subtopics** | HFrEF, Pharmacology, Oxygen Therapy |
| **Questions** | 3+ RN questions (chest pain, COPD, renal stone) with options |
| **Lab refs** | CBC, BMP, Coag sets with sample values |
| **Exam templates** | Pre-Practice 150q per track |
| **System exams** | Cardiovascular 50q (RN) |
| **Study guides** | Cardiovascular guide with 2 sections |
| **Topic summaries** | Heart failure summary |
| **Flashcards** | Cardiovascular deck with 2 cards |
| **Videos** | Heart failure, COPD lessons |
| **Content sources** | Saunders, NCSBN |
| **AI templates** | explain, mnemonic, flashcards, weak-area |
| **Subscription plans** | Free, 3mo, 6mo, 12mo |

### Extending the Seed

- Add rows to `supabase/seed_extended.sql` in dependency order
- Use subqueries for FKs: `(SELECT id FROM exam_tracks WHERE slug = 'rn')`
- Use `ON CONFLICT (slug) DO NOTHING` where unique constraints exist

## User Seed (`scripts/seed-user-data.ts`)

Run after signing up: `npm run seed:user -- --userId=YOUR_UUID`

### What Gets Seeded

- `user_exam_tracks` — RN enrollment
- `user_readiness_snapshots` — Sample 72% readiness
- `adaptive_question_queue` — 1 question (weak_system)
- `recommended_content_queue` — 1 study guide

### Prerequisites

- User must exist (sign up at `/signup`)
- Content seed must have run (`npm run db:seed`)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or anon key for local)

## Mock Data (Client-Side)

`src/data/mock/` provides in-memory mock data for UI development without a database:

- `systems.ts`, `questions.ts`, `study-guides.ts`, `flashcards.ts`, `videos.ts`
- `readiness.ts`, `recommendations.ts`, `admin.ts`

Use `NEXT_PUBLIC_USE_MOCK=true` or feature flags to switch between mock and real data.

## Sample Exam Sessions

Exam sessions require a user and are created when a user starts an exam. To seed a completed session:

1. Sign up and run `seed:user`
2. Start a Pre-Practice or System exam from the UI
3. Complete or abandon it — session is persisted

For automated QA, you can extend `seed-user-data.ts` to insert `exam_sessions` and `exam_session_questions` via the service client.
