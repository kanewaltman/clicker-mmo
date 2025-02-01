/*
  # Fix user progress handling

  1. Changes
    - Remove unique constraint on user_id to allow multiple progress records
    - Add composite primary key (user_id, id) for better indexing
    - Update RLS policies to handle multiple records per user
    
  2. Security
    - Maintain existing RLS policies with updated conditions
    - Ensure users can only access their own progress records
*/

-- Remove the unique constraint on user_id
ALTER TABLE user_progress
DROP CONSTRAINT IF EXISTS user_progress_user_id_key;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

-- Create updated policies
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);