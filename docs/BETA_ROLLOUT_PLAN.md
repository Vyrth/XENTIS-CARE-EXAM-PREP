# Beta Rollout Plan

## Phase 1: Internal (Week 1)

- [ ] Deploy to staging/preview
- [ ] Internal team smoke test
- [ ] Fix critical bugs
- [ ] Verify Stripe test mode, Supabase staging

## Phase 2: Closed Beta (Weeks 2–4)

**Invite**: 20–50 users (email list, waitlist)

**Criteria**:
- Nursing students or recent grads
- Mix of tracks (LVN, RN, FNP, PMHNP)

**Process**:
1. Send invite with signup link
2. Onboard: track selection, 1 practice question
3. Feedback: in-app widget + optional survey link
4. Weekly check-in email

**Success metrics**:
- Signup → first exam started: > 50%
- Exam completion rate
- AI usage (explain, mnemonic)
- NPS or qualitative feedback

## Phase 3: Open Beta (Weeks 5–8)

**Launch**: Public signup, limited marketing

**Changes**:
- Remove invite gate
- Add "Beta" badge in UI
- Feedback widget prominent
- Known issues page

**Monitoring**:
- Error rate, latency
- Support volume
- Top feedback themes

## Phase 4: Beta Exit (Week 9+)

**Criteria for GA**:
- Critical bugs resolved
- Performance acceptable
- Security review done
- Billing flow verified

**Transition**:
- Remove Beta badge
- Announce GA
- Migrate Stripe to live mode (when ready)

## Feedback Intake

- **In-app**: Floating "Feedback" button → modal
- **Post-exam**: "How was your experience?" prompt
- **Email**: Optional survey link in weekly digest
- **Slack/Discord**: If community exists

## Communication

- **Beta invite**: What to expect, how to give feedback
- **Known issues**: Document and link from dashboard
- **Updates**: Email or in-app changelog
