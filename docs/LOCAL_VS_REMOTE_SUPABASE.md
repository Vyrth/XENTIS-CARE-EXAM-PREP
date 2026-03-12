# Local vs Remote Supabase Commands

Use this guide to avoid confusing local development with remote deployment.

---

## Local Workflow (Docker)

For development on your machine with a local Supabase instance:

| Step | Command | Description |
|------|---------|-------------|
| 1 | `npm run db:local:start` | Start local Supabase (Docker) |
| 2 | `npm run db:local:migrate` | Reset local DB, run all migrations + seed |
| 3 | `npm run db:status` | Show local URL, anon key, service role key |

**Important:** `supabase db reset` applies to your **local** database only. It drops and recreates the DB, then runs migrations and `supabase/seed.sql`.

---

## Remote Workflow (Hosted Supabase)

For deploying schema changes to a hosted Supabase project (staging/production):

| Step | Command | Description |
|------|---------|-------------|
| 1 | `supabase link` | Link to your remote project (one-time) |
| 2 | `npm run db:remote:push` | Push migrations to remote DB |

**Important:** `supabase db push` applies to your **remote** project. It does **not** run `seed.sql`. Run seed manually via Supabase SQL Editor if needed.

---

## Never Mix These Up

| ❌ Wrong | ✅ Correct |
|----------|------------|
| `supabase db reset` for remote | `supabase db push` for remote |
| `supabase db push` for local | `supabase db reset` for local |
| Running `db reset` when you meant to update production | Use `db:remote:push` for production |

---

## Security: Service Role Key

**Never commit or expose `SUPABASE_SERVICE_ROLE_KEY`:**

- Do not commit `.env.local` or any file containing the service role key
- Do not include it in screenshots, docs, or logs
- Use environment variables or secrets managers in production
- The service role bypasses RLS — treat it as a root database password

---

## Quick Reference

```bash
# Local (Docker)
npm run db:local:start    # supabase start
npm run db:local:migrate  # supabase db reset (migrations + seed)
npm run db:status        # supabase status

# Remote (hosted project)
npm run db:remote:push   # supabase db push
```
