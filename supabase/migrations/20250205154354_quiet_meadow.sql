/*
  # Fix resource deletion policies

  1. Changes
    - Drop existing policies first
    - Create new policies that allow both guests and authenticated users to delete resources
    - Ensure deletion is allowed when health reaches 0

  2. Security
    - Maintains RLS for resource gathering
    - Allows both guest and authenticated users to delete resources
    - Preserves claim system functionality
*/

-- First drop all policies that depend on the gatherer_id column
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Anyone can gather resources" ON resources;
DROP POLICY IF EXISTS "Anyone can delete gathered resources" ON resources;

-- Create new policies that work with text type gatherer_id
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can gather resources"
  ON resources
  FOR UPDATE
  TO public
  USING (
    gatherer_id IS NULL OR 
    gatherer_id = coalesce(auth.uid()::text, 'guest')
  )
  WITH CHECK (
    (gatherer_id IS NULL AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id IS NULL)
  );

-- Allow deletion for both guests and authenticated users
CREATE POLICY "Anyone can delete resources"
  ON resources
  FOR DELETE
  TO public
  USING (true);