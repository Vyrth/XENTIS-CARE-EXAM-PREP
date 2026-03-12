-- =============================================================================
-- Migration 041: Adaptive Exam Indexes
-- =============================================================================
-- Add indexes for adaptive exam queries. All CREATE INDEX IF NOT EXISTS.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_adaptive_exam_sessions_user_status ON adaptive_exam_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_sessions_track_status ON adaptive_exam_sessions(exam_track_id, status);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_items_session_order ON adaptive_exam_items(adaptive_exam_session_id, served_order);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_items_question ON adaptive_exam_items(question_id);
CREATE INDEX IF NOT EXISTS idx_question_calibration_difficulty ON question_calibration(difficulty_b);
CREATE INDEX IF NOT EXISTS idx_question_calibration_exposure ON question_calibration(exposure_count);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_blueprint_progress_session ON adaptive_exam_blueprint_progress(adaptive_exam_session_id);

-- Additional indexes for config and session lookups
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_configs_track ON adaptive_exam_configs(exam_track_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_sessions_config ON adaptive_exam_sessions(adaptive_exam_config_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_exam_sessions_started ON adaptive_exam_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_question_calibration_question ON question_calibration(question_id);
