/*
  # Game Structures Schema

  1. New Tables
    - `structures`
      - `id` (uuid, primary key)
      - `type` (text) - Type of structure (e.g., 'pickaxe')
      - `position_x` (float) - X coordinate
      - `position_y` (float) - Y coordinate
      - `owner` (uuid) - Owner's user ID
      - `health` (int) - Current health of structure
      - `last_gather` (timestamptz) - Last resource gathering timestamp
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `structures` table
    - Add policies for:
      - Anyone can read structures
      - Users can create their own structures
      - Users can update/delete their own structures
*/

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

ALTER TABLE structures ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read structures
CREATE POLICY "Anyone can read structures"
  ON structures
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert their own structures
CREATE POLICY "Users can create their own structures"
  ON structures
  FOR INSERT
  TO public
  WITH CHECK (auth.uid()::text = owner::text);

-- Allow users to update their own structures
CREATE POLICY "Users can update their own structures"
  ON structures
  FOR UPDATE
  TO public
  USING (auth.uid()::text = owner::text);

-- Allow users to delete their own structures
CREATE POLICY "Users can delete their own structures"
  ON structures
  FOR DELETE
  TO public
  USING (auth.uid()::text = owner::text);