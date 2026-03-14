#!/usr/bin/env bash
set -euo pipefail

echo "Checking Supabase CLI..."
if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not found"
  exit 1
fi

if [ ! -d "supabase" ]; then
  echo "Error: supabase directory not found. Run this from repo root."
  exit 1
fi

if [ ! -d "supabase/migrations" ]; then
  echo "Error: supabase/migrations directory not found"
  exit 1
fi

echo "Checking migration directory..."
ls -1 supabase/migrations || true

echo "Checking for invalid files in migration directory..."
NON_SQL_FILES="$(find supabase/migrations -type f ! -name '*.sql' | tr '\n' ' ')"
if [ -n "${NON_SQL_FILES// }" ]; then
  echo "Error: Non-SQL files found in supabase/migrations:"
  echo "$NON_SQL_FILES"
  exit 1
fi

echo "Removing leftover temp schema check files..."
rm -f supabase/migrations/*__tmp_schema_check.sql
rm -f supabase/migrations/_tmp_schema_check.sql

echo "Checking Supabase project status..."
supabase status >/dev/null 2>&1 || {
  echo "Error: Supabase local stack is not running."
  echo "Start it with: supabase start"
  exit 1
}

echo "Running migration list..."
supabase migration list

echo "Scanning committed migrations for dangerous SQL..."
DANGEROUS_PATTERNS='drop[[:space:]]+table|drop[[:space:]]+schema|truncate[[:space:]]+table|delete[[:space:]]+from[[:space:]]+[a-zA-Z0-9_."-]+[[:space:]]*;|drop[[:space:]]+column'
TYPE_CHANGE_PATTERN='alter[[:space:]]+table.*alter[[:space:]]+column.*type'
ALLOW_MARKER='xentis-allow-destructive-change'

DANGEROUS_FOUND=0
TYPE_CHANGE_FOUND=0

for file in supabase/migrations/*.sql; do
  [ -f "$file" ] || continue
  # Skip generated drift temp file (allowed to contain DDL from diff)
  case "$file" in *"__tmp_schema_check"*) continue ;; esac

  if grep -qiE "$DANGEROUS_PATTERNS" "$file"; then
    if grep -qi "$ALLOW_MARKER" "$file"; then
      echo "Allowed destructive migration: $file"
    else
      echo "Error: Forbidden destructive SQL detected in migration: $file"
      grep -niE "$DANGEROUS_PATTERNS" "$file"
      DANGEROUS_FOUND=1
    fi
  fi

  if grep -qiE "$TYPE_CHANGE_PATTERN" "$file"; then
    if grep -qi "$ALLOW_MARKER" "$file"; then
      echo "Allowed column type change migration: $file"
    else
      echo "Error: Potential column type change detected in migration: $file"
      grep -niE "$TYPE_CHANGE_PATTERN" "$file"
      TYPE_CHANGE_FOUND=1
    fi
  fi
done

if [ "$DANGEROUS_FOUND" -ne 0 ] || [ "$TYPE_CHANGE_FOUND" -ne 0 ]; then
  exit 1
fi

echo "Checking for schema drift..."
TMP_NAME="__tmp_schema_check"
rm -f supabase/migrations/*"${TMP_NAME}.sql"

if ! supabase db diff -f "$TMP_NAME" >/dev/null 2>&1; then
  echo "Error: supabase db diff failed"
  rm -f supabase/migrations/*"${TMP_NAME}.sql"
  exit 1
fi

GENERATED_FILE="$(find supabase/migrations -maxdepth 1 -type f -name "*${TMP_NAME}.sql" | head -n 1 || true)"

if [ -n "${GENERATED_FILE:-}" ] && [ -f "$GENERATED_FILE" ]; then
  if [ -s "$GENERATED_FILE" ]; then
    echo "Error: Uncommitted schema drift detected."
    echo "Review generated diff: $GENERATED_FILE"
    echo "Convert intentional drift into a real migration before pushing."
    echo "(Drift file left for review; delete after resolving.)"
    exit_code=1
  else
    echo "No schema drift detected."
    exit_code=0
    rm -f "$GENERATED_FILE"
  fi
  if [ "${exit_code:-0}" -ne 0 ]; then
    exit "$exit_code"
  fi
fi

# RLS coverage check skipped: this project enables RLS in a dedicated migration (20250306000014)
# rather than per-table in the same file. Re-enable or refine for new migrations if desired.
# echo "Checking for RLS coverage on newly created tables..."
# MISSING_RLS=0
# for file in supabase/migrations/*.sql; do ...
# if [ "$MISSING_RLS" -ne 0 ]; then exit 1; fi

echo "Migration safety check passed."
