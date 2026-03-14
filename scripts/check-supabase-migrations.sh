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

DANGEROUS_MATCHES="$(grep -RniE "$DANGEROUS_PATTERNS" supabase/migrations/*.sql || true)"
TYPE_CHANGE_MATCHES="$(grep -RniE "$TYPE_CHANGE_PATTERN" supabase/migrations/*.sql || true)"

if [ -n "${DANGEROUS_MATCHES// }" ]; then
  echo "Error: Forbidden destructive SQL detected in migrations:"
  echo "$DANGEROUS_MATCHES"
  exit 1
fi

if [ -n "${TYPE_CHANGE_MATCHES// }" ]; then
  echo "Error: Potential column type changes detected. Review manually:"
  echo "$TYPE_CHANGE_MATCHES"
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
    exit_code=1
  else
    echo "No schema drift detected."
    exit_code=0
  fi
  rm -f "$GENERATED_FILE"
  if [ "${exit_code:-0}" -ne 0 ]; then
    exit "$exit_code"
  fi
fi

echo "Checking for RLS coverage on newly created tables..."
MISSING_RLS=0

for file in supabase/migrations/*.sql; do
  [ -f "$file" ] || continue

  created_tables=$(grep -iE 'create[[:space:]]+table([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?' "$file" \
    | sed -E 's/.*create[[:space:]]+table([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?[[:space:]]+("?public"?\.)?"?([a-zA-Z0-9_]+)"?.*/\3/I' \
    | sort -u)

  if [ -n "${created_tables:-}" ]; then
    while IFS= read -r table; do
      [ -n "$table" ] || continue
      if ! grep -qiE "alter[[:space:]]+table[[:space:]]+(if[[:space:]]+exists[[:space:]]+)?(\"?public\"?\.)?\"?$table\"?[[:space:]]+enable[[:space:]]+row[[:space:]]+level[[:space:]]+security" "$file"; then
        echo "Error: Table '$table' appears to be created in $file without ENABLE ROW LEVEL SECURITY in the same migration."
        MISSING_RLS=1
      fi
    done <<< "$created_tables"
  fi
done

if [ "$MISSING_RLS" -ne 0 ]; then
  exit 1
fi

echo "Migration safety check passed."
