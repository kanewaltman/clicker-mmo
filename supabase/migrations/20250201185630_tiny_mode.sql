/*
  # Add index for user progress lookups

  1. Changes
    - Add index on user_id for faster lookups
    - Add updated_at trigger for automatic timestamps
*/

-- Add index on user_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'user_progress'
    AND indexname = 'user_progress_user_id_idx'
  ) THEN
    CREATE INDEX user_progress_user_id_idx ON user_progress(user_id);
  END IF;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_user_progress_updated_at'
  ) THEN
    CREATE TRIGGER set_user_progress_updated_at
      BEFORE UPDATE ON user_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;