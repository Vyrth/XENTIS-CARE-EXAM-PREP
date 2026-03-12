# Starter Seed Dataset

## Overview

`seed_starter.sql` provides a minimal but functional learning dataset for all four exam tracks (LVN, RN, FNP, PMHNP).

## Contents Per Track

| Content Type | Count | Notes |
|--------------|-------|-------|
| Systems | 5 | Track-specific clinical areas |
| Topics | 10 | Shared across domains, linked to systems |
| Study guides | 2 | With sections |
| Questions | 5+ | Board-style single best answer |
| Flashcard deck | 1 | 20 cards |
| High-yield summaries | 5 | Board-focused content |
| Practice exam template | 1 | Links to question pool |

## Usage

Run after migrations and base seed:

```bash
# Full seed (includes starter)
psql $DATABASE_URL -f supabase/seed.sql

# Or run starter alone (requires exam_tracks, question_types, domains)
psql $DATABASE_URL -f supabase/seed_starter.sql
```

## Idempotency

- **ON CONFLICT DO NOTHING:** domains, question_types, systems, topics, topic_system_links, study_guides, exam_templates, exam_template_question_pool
- **NOT EXISTS:** flashcard_decks (no unique on name)
- **Re-runs:** May add duplicate questions, flashcards, high-yield content. Run once for clean state.

## Expanding Content

To reach 20 questions per track:

1. Use Admin → Questions → Bulk Import
2. Or add questions manually via Question Production Studio
3. Exam template pool auto-includes approved questions (up to 20 per track)
