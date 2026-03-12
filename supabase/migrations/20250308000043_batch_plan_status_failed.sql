-- Add 'failed' to batch_plan_status for unrecoverable batch plan failures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'failed'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'batch_plan_status')
  ) THEN
    ALTER TYPE batch_plan_status ADD VALUE 'failed';
  END IF;
END $$;
