/*
  # Add unique constraint to user_progress table
  
  1. Changes
    - Add unique constraint on user_id column in user_progress table
    
  2. Why
    - Required for upsert operations using ON CONFLICT
    - Ensures each user can only have one progress record
*/

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'user_progress_user_id_key'
  ) THEN
    ALTER TABLE user_progress 
    ADD CONSTRAINT user_progress_user_id_key 
    UNIQUE (user_id);
  END IF;
END $$;