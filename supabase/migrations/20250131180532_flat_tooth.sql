/*
  # Fix RLS policies for structures table

  1. Changes
    - Drop existing policies
    - Create new policies that allow public access for all operations
    - Keep structure ownership for updates and deletes

  2. Security
    - Allow public access for creating structures
    - Maintain owner-based restrictions for updates and deletes
*/

DO $$ BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Anyone can read structures" ON structures;
  DROP POLICY IF EXISTS "Users can create their own structures" ON structures;
  DROP POLICY IF EXISTS "Users can update their own structures" ON structures;
  DROP POLICY IF EXISTS "Users can delete their own structures" ON structures;
END $$;

-- Recreate policies with public access
CREATE POLICY "Anyone can read structures"
  ON structures
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create structures"
  ON structures
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Structure owners can update their structures"
  ON structures
  FOR UPDATE
  TO public
  USING (owner::text = owner::text);

CREATE POLICY "Structure owners can delete their structures"
  ON structures
  FOR DELETE
  TO public
  USING (owner::text = owner::text);