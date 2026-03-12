-- Make batch_job_id nullable so we can log campaign/shard/batch_plan events without a batch job
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ai_batch_job_logs'
    AND column_name = 'batch_job_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE ai_batch_job_logs ALTER COLUMN batch_job_id DROP NOT NULL;
  END IF;
END $$;
