# Demo Walkthrough

A step-by-step guide for demonstrating the nursing board-prep platform.

## Prerequisites

1. Run `npm run db:seed` (or `supabase db reset`)
2. Run `npm run dev`
3. Sign up at /signup
4. Run `npm run seed:user -- --userId=YOUR_UUID`

## Demo Flow

### 1. Sign In & Dashboard

- Go to `/`
- Sign in with demo account
- Dashboard shows readiness (if seeded), track, quick actions

### 2. Practice Mode

- Go to `/practice` or `/practice/rn`
- Select a system (e.g. Cardiovascular)
- Answer 10–15 questions
- Show: timer, flag, calculator, lab drawer
- Submit and review results

### 3. Pre-Practice Exam

- Go to `/pre-practice` or `/pre-practice/rn`
- Start exam (150q)
- Show: timer, progress, question navigation
- Optionally complete a few questions and submit

### 4. System Exam

- Go to `/practice/rn` → Cardiovascular
- Start "Cardiovascular System Exam" (50q)
- Same flow as Pre-Practice

### 5. Study Content

- Go to `/study` or `/study/rn`
- Open Cardiovascular study guide
- Show sections and content
- Open a video (placeholder)
- Open flashcards

### 6. Readiness & Recommendations

- Go to `/exam/readiness` or dashboard
- Show readiness score and breakdown
- Show adaptive question queue
- Show recommended content

### 7. AI Features

- From a study section or question
- Highlight text → "Explain"
- "Create mnemonic"
- "Generate flashcards"

### 8. Billing (if configured)

- Go to `/billing`
- Show current plan
- "Upgrade" → Stripe Checkout
- "Manage subscription" → Customer portal

## Talking Points

- **4 tracks**: LVN, RN, FNP, PMHNP — each with distinct content
- **13 question types**: Single best answer, multiple response, image-based, case study, dosage calc, etc.
- **Board-like tools**: Timer, calculator, lab reference, flag, whiteboard
- **Adaptive learning**: Weak areas, missed questions, recommended content
- **AI tutoring**: Explain, mnemonics, flashcards, weak-area coaching

## Troubleshooting

1. **No questions**: Run `npm run db:seed`
2. **No readiness**: Run `npm run seed:user -- --userId=YOUR_UUID`
3. **Stripe errors**: Check env vars in `.env.local`
4. **Supabase errors**: Verify URL and keys in `.env.local`
