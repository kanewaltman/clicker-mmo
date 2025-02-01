/*
  # Update structures table and policies

  1. Changes
    - Safely create or update structures table
    - Safely create or update RLS policies
    - Handle existing policies gracefully
*/

DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can read structures" ON structures;
  DROP POLICY IF EXISTS "Users can create their own structures" ON structures;
  DROP POLICY IF EXISTS "Users can update their own structures" ON structures;
  DROP POLICY IF EXISTS "Users can delete their own structures" ON structures;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  position_x float NOT NULL,
  position_y float NOT NULL,
  owner uuid NOT NULL,
  health int NOT NULL,
  last_gather timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Anyone can read structures"
  ON structures
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create their own structures"
  ON structures
  FOR INSERT
  TO public
  WITH CHECK (auth.uid()::text = owner::text);

CREATE POLICY "Users can update their own structures"
  ON structures
  FOR UPDATE
  TO public
  USING (auth.uid()::text = owner::text);

CREATE POLICY "Users can delete their own structures"
  ON structures
  FOR DELETE
  TO public
  USING (auth.uid()::text = owner::text);