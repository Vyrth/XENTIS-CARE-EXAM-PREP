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

echo "Checking migration directory..."
if [ ! -d "supabase/migrations" ]; then
  echo "Error: supabase/migrations directory not found"
  exit 1
fi

echo "Listing migrations..."
ls -1 supabase/migrations || true

echo "Checking for invalid SQL files..."
find supabase/migrations -type f ! -name "*.sql" | grep . && {
  echo "Error: Non-SQL file found in supabase/migrations"
  exit 1
} || true

echo "Checking Supabase project status..."
supabase status >/dev/null 2>&1 || {
  echo "Warning: Supabase local stack may not be running."
  echo "Start it with: supabase start"
  exit 1
}

echo "Running migration list..."
supabase migration list

echo "Generating schema diff smoke test..."
TMP_DIFF="supabase/migrations/_tmp_schema_check.sql"
rm -f "$TMP_DIFF"

supabase db diff -f _tmp_schema_check >/dev/null 2>&1 || {
  echo "Error: supabase db diff failed"
  rm -f "$TMP_DIFF"
  exit 1
}

if [ -f "$TMP_DIFF" ]; then
  if [ -s "$TMP_DIFF" ]; then
    echo "Warning: Uncommitted schema drift detected."
    echo "Review: $TMP_DIFF"
  else
    echo "No schema drift detected."
    rm -f "$TMP_DIFF"
  fi
fi

echo "Migration safety check passed."
