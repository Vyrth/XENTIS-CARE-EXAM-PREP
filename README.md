# Xentis Care Exam Prep

Nursing board-prep platform for LVN, RN, FNP, and PMHNP tracks.

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # Add Supabase, Stripe, OpenAI keys
npm run dev
```

## Documentation

- **[Local Setup](docs/LOCAL_SETUP.md)** — Env vars, scripts, database, tooling
- **[Local vs Remote Supabase Commands](docs/LOCAL_VS_REMOTE_SUPABASE.md)** — Avoid mixing local and remote DB workflows
- **[Seed Strategy](docs/SEED_STRATEGY.md)** — Content and user seed data
- **[QA Checklist](docs/QA_CHECKLIST.md)** — Pre-release verification
- **[Demo Walkthrough](docs/DEMO_WALKTHROUGH.md)** — Step-by-step demo flow
- **[Launch Readiness](docs/LAUNCH_READINESS_CHECKLIST.md)** — Beta/production checklist
- **[Production Hardening](docs/PRODUCTION_HARDENING_PLAN.md)** — Error boundaries, rate limiting, audit logs
- **[Monitoring Plan](docs/MONITORING_PLAN.md)** — Observability, alerts, health
- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** — Auth, RLS, API security
- **[Beta Rollout](docs/BETA_ROLLOUT_PLAN.md)** — Phased launch plan
- **[Bug Triage](docs/POST_LAUNCH_BUG_TRIAGE.md)** — Severity, workflow

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run qa` | Typecheck + lint + format + test |
| `npm run db:local:start` | Start local Supabase |
| `npm run db:local:migrate` | Reset local DB, run migrations + seed |
| `npm run db:remote:push` | Push migrations to remote Supabase |
| `npm run db:seed` | Same as db:local:migrate |
| `npm run seed:user` | Seed user data (after signup) |

## Tech Stack

- Next.js 14, React, TypeScript
- Supabase (Auth, DB, Storage)
- Stripe (Billing)
- OpenAI (AI tutoring)
