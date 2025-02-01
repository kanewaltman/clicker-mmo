/*
  # Create user progress table

  1. New Tables
    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique, references auth.users)
      - `resources` (integer)
      - `position_x` (float)
      - `position_y` (float)
      - `updated_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_progress` table
    - Add policies for users to manage their own progress
*/

CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  resources integer NOT NULL DEFAULT 0,
  position_x float NOT NULL DEFAULT 0,
  position_y float NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own progress
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own progress
CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own progress
CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);