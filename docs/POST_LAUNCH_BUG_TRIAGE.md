# Post-Launch Bug Triage Workflow

## Severity Definitions

| Severity | Definition | Response |
|----------|------------|----------|
| **P0 Critical** | App down, data loss, security breach | Immediate fix, deploy ASAP |
| **P1 High** | Core flow broken (signup, exam, payment) | Fix within 24h |
| **P2 Medium** | Feature broken, workaround exists | Fix within 1 week |
| **P3 Low** | Minor bug, cosmetic | Backlog |

## Triage Process

1. **Report arrives** (feedback form, support, Sentry)
2. **Assign severity** using table above
3. **Reproduce** — Can we reproduce? If not, request more info
4. **Assign** — Owner (dev, PM)
5. **Track** — GitHub issue, Jira, or Notion with label
6. **Resolve** — Fix, test, deploy
7. **Close** — Notify reporter if contactable

## Triage Meeting (Recommended)

- **Frequency**: Daily during beta, 2x/week post-GA
- **Attendees**: Eng, PM, Support (if any)
- **Agenda**: New bugs, severity, assignment, P0/P1 status

## Escalation

- **P0**: Page on-call, Slack #incidents
- **P1**: Same-day triage, PM awareness
- **P2/P3**: Weekly backlog review

## Bug Report Template

```
**Summary**: One-line description
**Severity**: P0/P1/P2/P3
**Steps**: How to reproduce
**Expected**: What should happen
**Actual**: What happened
**Environment**: Browser, OS, user type (free/paid)
**Screenshots**: If applicable
```

## Feedback → Bug

- Not all feedback is a bug
- Categorize: Bug | Feature request | Question
- Bugs get triaged; feature requests go to roadmap
