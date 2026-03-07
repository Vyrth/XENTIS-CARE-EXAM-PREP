# Security Checklist

## Authentication & Session

- [ ] Supabase Auth: secure session cookies (httpOnly, secure, sameSite)
- [ ] Session expiry configured
- [ ] Password reset flow secure (token expiry)
- [ ] OAuth: validate redirect URIs

## Authorization

- [ ] RLS enabled on all user-scoped tables
- [ ] Service role used only server-side (webhooks, cron)
- [ ] Admin routes check `user_admin_roles`
- [ ] No client-side role checks as sole gate

## API Security

- [ ] All API routes require auth where appropriate
- [ ] Input validation (Zod, etc.) on request bodies
- [ ] Rate limiting on AI and auth endpoints
- [ ] No sensitive data in URL query params

## Data Protection

- [ ] No API keys in client bundle
- [ ] Env vars: `NEXT_PUBLIC_*` only for non-secret config
- [ ] Stripe: use webhook signature verification
- [ ] Supabase: anon key has RLS; service key never exposed

## Injection & XSS

- [ ] User content sanitized before render
- [ ] No `dangerouslySetInnerHTML` with user input
- [ ] SQL: parameterized queries (Supabase client)

## CSRF & Clicks

- [ ] SameSite cookies
- [ ] State param on OAuth flows
- [ ] Idempotency for critical mutations

## Infrastructure

- [ ] HTTPS only
- [ ] CSP headers (restrict script sources)
- [ ] Security headers: X-Frame-Options, X-Content-Type-Options

## Compliance (if applicable)

- [ ] Data retention policy
- [ ] User data export/deletion
- [ ] Privacy policy, terms of service
