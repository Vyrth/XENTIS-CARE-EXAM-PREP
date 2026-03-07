# Launch Readiness Checklist

Use this checklist before beta and production launches.

## Pre-Launch (Beta)

### Code Quality
- [ ] All tests pass (`npm run test:run`)
- [ ] TypeScript clean (`npm run typecheck`)
- [ ] Lint clean (`npm run lint`)
- [ ] No console.log in production paths
- [ ] Error boundaries wrap critical routes
- [ ] Loading states on async pages
- [ ] Empty states for lists/feeds

### Security
- [ ] No secrets in client bundle
- [ ] API routes validate auth
- [ ] Rate limiting on AI endpoints
- [ ] CORS configured
- [ ] CSP headers (if applicable)
- [ ] Input validation/sanitization

### Infrastructure
- [ ] Env vars set in production
- [ ] Supabase RLS policies verified
- [ ] Stripe webhook endpoint live
- [ ] Database backups configured

### User Experience
- [ ] Skip-to-content link
- [ ] Focus management in modals
- [ ] Form error messages
- [ ] 404 and error pages

## Beta Launch

- [ ] Launch readiness checklist complete
- [ ] Beta feedback form live
- [ ] Monitoring dashboards ready
- [ ] On-call / triage process defined

## Production Launch

- [ ] Beta feedback addressed (critical items)
- [ ] Security review complete
- [ ] Performance benchmarks met
- [ ] Load testing done
- [ ] Rollback plan documented
