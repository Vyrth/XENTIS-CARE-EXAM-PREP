# Xentis Care Exam Prep — Engineering Implementation Plan

**Version:** 1.0  
**Date:** March 6, 2025  
**Status:** Architecture & Planning

---

## 1. Engineering Implementation Plan

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VERCEL (Edge + Serverless)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Next.js App Router                                                          │
│  ├── Public Routes (Landing, Pricing, FAQ, Legal)                            │
│  ├── Auth Middleware (protect /app/*, /study/*, /exam/*)                     │
│  └── API Routes (RSC + Route Handlers)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │     Stripe      │  │   OpenAI API    │
│  Auth, DB, RLS  │  │  Subscriptions  │  │  Tutor + Embed   │
│  Storage        │  │  Webhooks       │  │  RAG Retrieval   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 1.2 Implementation Phases

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| **P0** | Foundation | Auth, DB schema, public pages, layout |
| **P1** | Content & Study | Study materials, highlighting, notebook, flashcards |
| **P2** | Exam Engine | Item types, timer, tools, Pre-Practice Exam |
| **P3** | AI & Analytics | AI tutor, RAG, readiness tracking, recommendations |
| **P4** | Monetization | Stripe, subscriptions, gating |
| **P5** | Polish | Performance, accessibility, edge cases |

### 1.3 Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth | Supabase Auth (Google, Apple) | Native OAuth, RLS integration, session management |
| State | Server Components + React Query | Minimize client JS, cache server data |
| AI Context | RAG over approved content | Ground answers, avoid hallucinations |
| Exam State | URL + DB persistence | Deep links, resume, audit trail |
| Payments | Stripe Subscriptions | Industry standard, webhooks, metered billing ready |

---

## 2. Proposed Folder Structure

```
xentis-care-exam-prep/
├── .env.local.example
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing (public)
│   │   ├── globals.css
│   │   │
│   │   ├── (public)/                  # Public route group
│   │   │   ├── pricing/page.tsx
│   │   │   ├── faq/page.tsx
│   │   │   ├── legal/
│   │   │   │   ├── terms/page.tsx
│   │   │   │   └── privacy/page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (auth)/                    # Auth route group
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── callback/route.ts      # OAuth callback
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (app)/                     # Protected app shell
│   │   │   ├── layout.tsx             # Auth check, sidebar
│   │   │   ├── dashboard/page.tsx
│   │   │   │
│   │   │   ├── study/                 # Study materials
│   │   │   │   ├── [track]/page.tsx   # LVN, RN, FNP, PMHNP
│   │   │   │   ├── [track]/[system]/page.tsx
│   │   │   │   └── [track]/[system]/[module]/page.tsx
│   │   │   │
│   │   │   ├── notebook/page.tsx
│   │   │   ├── flashcards/page.tsx
│   │   │   └── videos/page.tsx
│   │   │
│   │   │   ├── practice/              # Practice exams
│   │   │   │   ├── [track]/page.tsx
│   │   │   │   └── [track]/[examId]/page.tsx
│   │   │   │
│   │   │   ├── pre-practice/          # 150-question Pre-Practice
│   │   │   │   └── [track]/page.tsx
│   │   │   │
│   │   │   └── ai-tutor/page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...supabase]/route.ts
│   │       ├── stripe/
│   │       │   └── webhooks/route.ts
│   │       ├── ai/
│   │       │   ├── tutor/route.ts
│   │       │   ├── mnemonic/route.ts
│   │       │   ├── flashcards/route.ts
│   │       │   └── summarize/route.ts
│   │       └── exam/
│   │           └── [sessionId]/route.ts
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── auth/
│   │   │   ├── GoogleButton.tsx
│   │   │   └── AppleButton.tsx
│   │   ├── study/
│   │   │   ├── ContentViewer.tsx
│   │   │   ├── Highlighter.tsx
│   │   │   └── NoteCard.tsx
│   │   ├── exam/
│   │   │   ├── ExamShell.tsx
│   │   │   ├── QuestionRenderer.tsx
│   │   │   ├── Timer.tsx
│   │   │   ├── NavigationBar.tsx
│   │   │   ├── ReviewScreen.tsx
│   │   │   ├── CalculatorDrawer.tsx
│   │   │   ├── LabReferenceDrawer.tsx
│   │   │   ├── WhiteboardDrawer.tsx
│   │   │   ├── ImageZoom.tsx
│   │   │   └── ItemTypeRenderers/
│   │   │       ├── SingleBestAnswer.tsx
│   │   │       ├── MultipleResponse.tsx
│   │   │       ├── SelectN.tsx
│   │   │       ├── ImageBased.tsx
│   │   │       ├── ChartExhibit.tsx
│   │   │       ├── Matrix.tsx
│   │   │       ├── DropdownCloze.tsx
│   │   │       ├── OrderedResponse.tsx
│   │   │       ├── Hotspot.tsx
│   │   │       ├── HighlightText.tsx
│   │   │       ├── CaseStudy.tsx
│   │   │       ├── BowTieAnalog.tsx
│   │   │       └── DosageCalc.tsx
│   │   └── ai/
│   │       ├── TutorChat.tsx
│   │       └── WeakAreaCard.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   ├── server.ts              # Server client
│   │   │   └── middleware.ts
│   │   ├── stripe.ts
│   │   ├── openai.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useExamSession.ts
│   │   ├── useHighlight.ts
│   │   └── useSubscription.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── content.service.ts
│   │   ├── exam.service.ts
│   │   ├── ai.service.ts
│   │   ├── analytics.service.ts
│   │   └── subscription.service.ts
│   │
│   ├── types/
│   │   ├── database.types.ts          # Supabase generated
│   │   ├── exam.types.ts
│   │   ├── content.types.ts
│   │   └── ai.types.ts
│   │
│   └── config/
│       ├── tracks.ts                  # LVN, RN, FNP, PMHNP
│       ├── item-types.ts
│       └── systems.ts                 # Per-track systems
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── ...
│   ├── functions/                     # Edge functions (optional)
│   └── seed.sql
│
├── content/                           # Approved content (or CMS reference)
│   └── README.md
│
└── docs/
    ├── ENGINEERING_IMPLEMENTATION_PLAN.md
    ├── DATABASE_SCHEMA.md
    └── API_SPEC.md
```

---

## 3. Main Services & Modules

### 3.1 Auth Service (`auth.service.ts`)
- `signInWithGoogle()`, `signInWithApple()`
- `signOut()`, `getSession()`
- `refreshSession()`
- Middleware integration for route protection

### 3.2 Content Service (`content.service.ts`)
- `getStudyMaterials(track, system, module)`
- `getPracticeExams(track)` — 50+ questions per system
- `getPrePracticeExam(track)` — 150 questions
- `getFlashcards(userId, filters)`
- `getVideos(track, system)`
- Content versioning for RAG/embeddings

### 3.3 Exam Service (`exam.service.ts`)
- `createSession(track, examType, userId)`
- `getSession(sessionId)`, `updateSession(sessionId, payload)`
- `submitAnswer(sessionId, questionId, response)`
- `flagQuestion(sessionId, questionId)`
- `getExamResults(sessionId)`
- State persistence (answers, flags, time remaining)
- Support for all item types (single, multiple, select N, image, chart, matrix, cloze, ordered, hotspot, highlight, case-study, bow-tie, dosage calc)

### 3.4 AI Service (`ai.service.ts`)
- `explainHighlightedText(text, context)` — grounded in approved content
- `generateMnemonic(topic)`
- `generateFlashcards(notes)`
- `summarizeNotes(notes)`
- `weakAreaCoaching(userId)` — uses analytics
- RAG: embed approved content, retrieve relevant chunks, pass to OpenAI
- Strict prompt: "Only use provided context. If unsure, say so."

### 3.5 Analytics Service (`analytics.service.ts`)
- `recordAnswer(userId, questionId, correct, domain, system, skill)`
- `getReadiness(userId, track)` — weak systems, domains, skills
- `getAdaptiveRecommendations(userId)` — prioritize weak areas, low confidence, repeated misses
- `getConfidenceByDomain(userId)`

### 3.6 Subscription Service (`subscription.service.ts`)
- `createCheckoutSession(userId, priceId, successUrl, cancelUrl)`
- `getSubscription(userId)`
- `cancelSubscription(userId)`
- Webhook handling: `customer.subscription.*`, `invoice.*`
- Gate study tools behind subscription status

### 3.7 Supporting Modules
- **Highlighting**: Store ranges (start/end offsets) per user, per content block
- **Notebook**: CRUD for notes linked to content IDs
- **Lab Reference**: Static PDF/image content in drawer
- **Calculator**: Client-side math (no server)

---

## 4. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-only, bypasses RLS

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_LVN=price_...
STRIPE_PRICE_ID_RN=price_...
STRIPE_PRICE_ID_FNP=price_...
STRIPE_PRICE_ID_PMHNP=price_...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# App
NEXT_PUBLIC_APP_URL=https://xentis-care.com
NEXT_PUBLIC_APP_ENV=production
```

### Optional / Future
```bash
# Vercel Analytics (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=

# Sentry (optional)
SENTRY_DSN=
```

---

## 5. Risks and Dependencies

### 5.1 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Apple Sign-In** requires Apple Developer account ($99/yr) and domain verification | High | Plan Apple setup early; fallback to email magic link if delayed |
| **OpenAI rate limits / cost** for AI tutor at scale | Medium | Use gpt-4o-mini, cache common queries, implement usage caps per user |
| **Content licensing** — must be original/approved only | High | Legal review; content ingestion pipeline with approval workflow |
| **150-question Pre-Practice** load time and state size | Medium | Lazy-load questions, paginate state, use IndexedDB for large sessions |
| **Complex item types** (hotspot, matrix, bow-tie) — dev effort | Medium | Prioritize core types first; phase advanced types |
| **Stripe webhook reliability** | Medium | Idempotency keys, retry logic, manual reconciliation tool |
| **Supabase RLS** misconfiguration exposing data | High | Audit all policies; use service role only where necessary |

### 5.2 Dependencies

| Dependency | Purpose | Notes |
|------------|---------|-------|
| **Supabase** | Auth, DB, Storage, RLS | Core infra |
| **Stripe** | Subscriptions | Webhooks must be configured |
| **OpenAI** | AI tutor, embeddings | API key, usage monitoring |
| **Next.js 14+** | Framework | App Router, RSC |
| **Tailwind CSS** | Styling | Design system |
| **shadcn/ui** (recommended) | UI components | Accessible, customizable |
| **Vercel** | Hosting | Edge, serverless |

### 5.3 External Integrations
- **Google OAuth**: Supabase handles; configure in Supabase dashboard
- **Apple OAuth**: Requires Apple Developer setup; add to Supabase
- **Stripe Customer Portal**: For subscription management

---

## 6. Suggested Sprint Breakdown

### Sprint 0 (1 week) — Setup & Design
- [ ] Initialize Next.js, TypeScript, Tailwind
- [ ] Configure Supabase project, enable Google/Apple auth
- [ ] Design system: colors, typography, components
- [ ] Create DB schema (users, profiles, tracks, systems, content, exams)
- [ ] RLS policies for users/profiles

### Sprint 1 (2 weeks) — Auth & Public
- [ ] Auth flow: login, signup, callback, middleware
- [ ] Public pages: landing, pricing, FAQ, legal
- [ ] Protected layout and redirect logic
- [ ] User profile creation on first sign-in

### Sprint 2 (2 weeks) — Content & Study Shell
- [ ] Content service and DB schema for study materials
- [ ] Study routes: track → system → module
- [ ] ContentViewer with basic reading
- [ ] Highlighting: capture, store, display
- [ ] Notebook: create, edit, delete notes

### Sprint 3 (2 weeks) — Flashcards & Videos
- [ ] Flashcard data model and CRUD
- [ ] Flashcard study UI (flip, rate, spaced repetition basics)
- [ ] Video embedding (YouTube/Vimeo or hosted)
- [ ] System-based study bundles structure

### Sprint 4 (2 weeks) — Exam Engine Core
- [ ] Exam session creation and persistence
- [ ] Question renderers: single best answer, multiple response, select N
- [ ] Timer, flag, prev/next navigation
- [ ] Review screen
- [ ] Basic practice exam (50 questions)

### Sprint 5 (2 weeks) — Exam Tools & More Item Types
- [ ] Calculator drawer
- [ ] Lab reference drawer
- [ ] Whiteboard/scratchpad
- [ ] Image zoom, strikeout, highlight in question
- [ ] Item types: image-based, chart/table, dropdown cloze, ordered response

### Sprint 6 (2 weeks) — Advanced Item Types & Pre-Practice
- [ ] Case-study tabs
- [ ] Hotspot, highlight text/table, matrix
- [ ] Bow-tie analog, dosage calc
- [ ] Pre-Practice Exam (150 questions) for all 4 tracks
- [ ] Exam results and scoring

### Sprint 7 (2 weeks) — AI Tutor & RAG
- [ ] Content embedding pipeline
- [ ] RAG retrieval service
- [ ] AI tutor: explain highlight, mnemonic, flashcards, summarize
- [ ] TutorChat UI with context grounding

### Sprint 8 (2 weeks) — Analytics & Recommendations
- [ ] Answer recording (domain, system, skill)
- [ ] Readiness dashboard
- [ ] Weak-area identification
- [ ] Adaptive recommendations algorithm
- [ ] Weak-area coaching in AI

### Sprint 9 (2 weeks) — Stripe & Gating
- [ ] Stripe products and prices for each track
- [ ] Checkout flow
- [ ] Webhook handling
- [ ] Subscription gating for study tools
- [ ] Customer portal link

### Sprint 10 (1–2 weeks) — Polish & Launch
- [ ] Performance: lazy loading, caching
- [ ] Accessibility audit
- [ ] Error boundaries, loading states
- [ ] E2E tests for critical paths
- [ ] Production deployment

---

## Appendix A: Item Type Reference

| Type | Description | UI Complexity |
|------|-------------|---------------|
| Single best answer | One correct option | Low |
| Multiple response | Multiple correct, select all | Low |
| Select N | Choose exactly N options | Low |
| Image-based | Question with image | Medium |
| Chart/table exhibit | Tabular/graph data | Medium |
| Matrix | Rows × columns selection | Medium |
| Dropdown cloze | Fill blanks with dropdowns | Medium |
| Ordered response | Drag to reorder | Medium |
| Hotspot | Click on image region | High |
| Highlight text/table | Select text in passage | High |
| Case-study | Multi-tab scenario | High |
| Bow-tie analog | Cause → event → effect | High |
| Dosage calc | Numeric input with units | Medium |

---

## Appendix B: Database Entities (High-Level)

- `profiles` — user metadata, track preference
- `tracks` — LVN, RN, FNP, PMHNP
- `systems` — per-track (e.g., Cardiovascular, Respiratory)
- `content_blocks` — study material chunks
- `questions` — exam items with `item_type`, `metadata`
- `exam_sessions` — user exam attempts
- `exam_answers` — per-question responses
- `highlights` — user highlights on content
- `notes` — notebook entries
- `flashcards` — user-generated or AI-generated
- `answer_analytics` — aggregated for recommendations
- `subscriptions` — Stripe subscription state

---

*End of Engineering Implementation Plan*
