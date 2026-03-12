# Enum-Safe Migration Behavior

## Problem

PostgreSQL disallows using a newly added enum value in the **same transaction** as `ALTER TYPE ... ADD VALUE`. You get:

```
ERROR: unsafe use of new value "editor_review" of enum type content_status
ERROR: unsafe use of new value "sme_reviewer" of enum type admin_role_slug
```

This applies to **any** use of the new value: `UPDATE`, `INSERT`, `DEFAULT`, etc.

## Solution

**Separate enum additions from any usage of those values:**

1. **Migration 027** – Enum additions and structural changes only (no usage of new values):
   - `ALTER TYPE content_status ADD VALUE IF NOT EXISTS 'editor_review'` (etc.)
   - `ALTER TYPE admin_role_slug ADD VALUE IF NOT EXISTS 'sme_reviewer'` (etc.)
   - `CREATE TABLE` for content_review_notes, content_review_checks, content_type_review_config
   - `INSERT` into content_type_review_config (uses TEXT, not enums)

2. **Migration 031** – All usage of newly added enum values:
   - `UPDATE` content tables: `review` → `editor_review`, `archived` → `retired`
   - `INSERT INTO admin_roles` for sme_reviewer, legal_reviewer, qa_reviewer (uses admin_role_slug)

## Rule

Never use a newly added enum value (in `UPDATE`, `INSERT`, `DEFAULT`, etc.) in the same migration that adds it. Use a follow-up migration.

## Remaining Risks

- **New enum types** (e.g. `CREATE TYPE x AS ENUM ('a','b')`) are safe to use immediately—values are defined atomically.
- **Adding to existing enums** (`ALTER TYPE x ADD VALUE 'c'`) requires a separate migration for any usage of `'c'`.
