# Monitoring Plan

## Observability Stack (Recommendations)

| Layer | Tool | Purpose |
|-------|------|---------|
| **APM** | Vercel Analytics, Sentry | Errors, performance |
| **Logs** | Vercel Logs, Supabase Logs | Request/DB logs |
| **Metrics** | Vercel Analytics, custom | Page views, conversions |
| **Uptime** | Better Uptime, Pingdom | External health checks |
| **Alerts** | PagerDuty, Slack | Incident notification |

## Key Metrics

### Application
- **Error rate**: % of 5xx responses
- **P95 latency**: API and page load
- **AI endpoint**: Requests/min, error rate, token usage
- **Webhook**: Success rate, retry count

### Business
- **Signups**: Daily/weekly
- **Exam completions**: Per track
- **AI actions**: Per user, per day
- **Upgrades**: Checkout → success

### Infrastructure
- **Supabase**: Connection pool, query latency
- **Stripe**: Webhook delivery status

## Dashboards

1. **Operations**: Errors, latency, uptime
2. **AI**: Rate limit hits, OpenAI errors, usage
3. **Billing**: Webhook success, subscription events
4. **Beta**: Feedback volume, top issues

## Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High error rate | 5xx > 5% over 5 min | Page on-call |
| AI endpoint down | 5xx on /api/ai | Investigate |
| Webhook failures | Stripe webhook 5xx | Check logs, retry |
| DB connection | Supabase errors | Check pool/config |

## Logging Standards

- **Structured logs**: JSON with `level`, `message`, `context`
- **Request ID**: Propagate for tracing
- **PII**: Never log passwords, tokens; hash user IDs in logs if needed

## Health Endpoint

`GET /api/health` — Returns 200 if app is up.

```json
{ "status": "ok", "timestamp": "2025-03-06T12:00:00.000Z" }
```

Optional: extend to check Supabase connection, Stripe config.

---

## Storage Cleanup Strategy

| Data | Retention | Action |
|------|-----------|--------|
| ai_interaction_logs | 12 months | Archive/delete older |
| exam_sessions | 2 years | Anonymize or delete |
| stripe_webhook_events | 90 days | Delete processed events |
| Temp uploads (Storage) | 7 days | Lifecycle rule |
| Media assets (unused) | 90 days | Soft delete → hard delete |

**Cron**: Supabase Edge Function or external job (e.g. Vercel Cron) weekly.
