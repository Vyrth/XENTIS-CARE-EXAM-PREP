# QA Checklist

Use this checklist before releases and for manual QA.

## Pre-Commit

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test:run` passes

## Auth & Onboarding

- [ ] Sign up creates profile
- [ ] Sign in / sign out works
- [ ] Track selection persists
- [ ] Password reset flow works

## Practice & Exams

- [ ] Practice mode loads questions by track
- [ ] Pre-Practice exam starts (150q)
- [ ] System exam starts (50q)
- [ ] Timer counts down
- [ ] Progress counter updates
- [ ] Flag for review works
- [ ] Calculator / lab drawer opens
- [ ] Submit exam shows results
- [ ] Session persists (resume after refresh)

## Study Content

- [ ] Study guides load
- [ ] Sections expand/collapse
- [ ] Videos play (or placeholder)
- [ ] Flashcards flip
- [ ] Topic summaries display

## Readiness & Analytics

- [ ] Readiness score displays
- [ ] System/domain breakdown
- [ ] Adaptive queue shows recommendations
- [ ] Content queue shows

## AI Features

- [ ] Explain concept works
- [ ] Mnemonic generation works
- [ ] Flashcard generation works
- [ ] Rate limiting (if applicable)

## Billing & Entitlements

- [ ] Free plan limits enforced
- [ ] Upgrade flow → Stripe Checkout
- [ ] Success/cancel pages
- [ ] Customer portal
- [ ] Subscription status in UI
- [ ] Downgrade on cancel/expire

## Admin (if applicable)

- [ ] Content review queue
- [ ] Question approval workflow
- [ ] Media rights records

## Cross-Browser

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile viewport

## Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader basics
- [ ] Focus indicators
