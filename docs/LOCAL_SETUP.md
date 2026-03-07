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
supabase start
supabase db reset   # Runs migrations + seed

# 4. Run dev server
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, seed | Service role key (never expose in client) |
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
| `npm run db:reset` | Supabase db reset (migrations + seed) |
| `npm run db:seed` | Same as db:reset |
| `npm run seed:user` | Seed user data (run after signup) |

## Database

### Local Supabase

```bash
supabase start
supabase db reset   # Drops DB, runs migrations, runs seed
supabase status    # Get local URL and keys
```

### Remote Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run: `supabase db push` (or apply migrations manually)
3. Run seed.sql via Supabase SQL Editor or `psql`

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
