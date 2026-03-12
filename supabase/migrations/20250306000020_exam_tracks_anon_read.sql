-- =============================================================================
-- Migration 020: Allow anonymous read of exam_tracks
-- =============================================================================

DROP POLICY IF EXISTS "Anon and authenticated read exam_tracks" ON exam_tracks;

CREATE POLICY "Anon and authenticated read exam_tracks"
  ON exam_tracks
  FOR SELECT
  TO anon, authenticated
  USING (true);
