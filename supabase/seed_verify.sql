-- =============================================================================
-- Seed Verification - Run after seed.sql to confirm inserted data
-- =============================================================================
-- Usage: psql $DATABASE_URL -f supabase/seed_verify.sql
-- =============================================================================

-- Systems: count per track
SELECT et.slug AS track_slug, COUNT(s.id) AS system_count
FROM exam_tracks et
LEFT JOIN systems s ON s.exam_track_id = et.id
GROUP BY et.slug
ORDER BY et.display_order;

-- Systems: list of slugs per track
SELECT et.slug AS track_slug, array_agg(s.slug ORDER BY s.display_order) AS system_slugs
FROM exam_tracks et
LEFT JOIN systems s ON s.exam_track_id = et.id
GROUP BY et.slug
ORDER BY et.display_order;
