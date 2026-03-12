# Local Developer Setup

## Prerequisites

- Node.js 18+
- npm or pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB)
- Docker (for Supabase local)

## Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd XENTIS-CARE-EXAM-PREP
npm install

# 2. Copy env
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and keys

# 3. Start Supabase (optional - for local DB)
npm run db:local:start
npm run db:local:migrate   # Runs migrations + seed (local only)

# 4. Run dev server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, seed | Service role key — **never commit, never show in screenshots** |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (e.g. http://localhost:3000) |
| `STRIPE_SECRET_KEY` | Billing | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhooks | Stripe webhook signing secret |
| `OPENAI_API_KEY` | AI features | OpenAI API key |

## Script Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run test` | Run Vitest (watch) |
| `npm run test:run` | Run tests once |
| `npm run test:ui` | Vitest UI |
| `npm run qa` | Full QA: typecheck + lint + format + test |
| `npm run db:local:start` | Start local Supabase (Docker) |
| `npm run db:local:migrate` | Reset local DB, run migrations + seed |
| `npm run db:remote:push` | Push migrations to remote Supabase |
| `npm run db:status` | Show local URL and keys |
| `npm run db:reset` | Same as db:local:migrate |
| `npm run db:seed` | Same as db:local:migrate |
| `npm run seed:user` | Seed user data (run after signup) |

## Database

See **[Local vs Remote Supabase Commands](LOCAL_VS_REMOTE_SUPABASE.md)** for a clear separation of workflows.

### Local Supabase

```bash
npm run db:local:start    # Start Docker
npm run db:local:migrate  # Drops DB, runs migrations, runs seed
npm run db:status         # Get local URL and keys
```

### Remote Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run: `npm run db:remote:push` (or `supabase db push`)
3. Run seed.sql via Supabase SQL Editor or `psql` (push does not run seed)

### Seed User Data

After signing up:

```bash
npm run seed:user -- --userId=YOUR_UUID
```

Get your UUID from Supabase Auth → Users, or from the profile after signup.

## Linting & Formatting

- **ESLint**: Next.js config + TypeScript
- **Prettier**: 2 spaces, semicolons, trailing commas
- **TypeScript**: Strict mode

Run `npm run qa` before committing.

## Test Scaffolding

- **Vitest** for unit tests
- **jsdom** for DOM
- Tests in `src/**/*.test.{ts,tsx}` or `src/**/*.spec.{ts,tsx}`

Example:

```ts
import { describe, it, expect } from "vitest";

describe("MyComponent", () => {
  it("renders", () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Mock Storage Assets

Placeholder assets in `public/`:

- `placeholder-ecg.svg` — ECG rhythm strip for image-based questions

For local dev, use `/placeholder-ecg.svg` or similar. Production will use Supabase Storage.
