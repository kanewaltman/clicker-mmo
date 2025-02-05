/*
  # Fix gatherer_id policies and type

  1. Changes
    - Drop all existing policies first
    - Drop foreign key constraint
    - Change gatherer_id type to text
    - Create new policies for both guest and authenticated users

  2. Security
    - Maintains RLS for resource gathering
    - Allows both guest and authenticated users to gather
    - Preserves claim system functionality
*/

-- First drop all policies that depend on the gatherer_id column
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Anyone can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Anyone can delete claimed resources" ON resources;
DROP POLICY IF EXISTS "Users can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Users can delete resources they own" ON resources;

-- Drop the foreign key constraint if it exists
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_gatherer_id_fkey;

-- Now we can safely change the column type
ALTER TABLE resources
ALTER COLUMN gatherer_id TYPE text USING gatherer_id::text;

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

CREATE POLICY "Anyone can delete gathered resources"
  ON resources
  FOR DELETE
  TO public
  USING (gatherer_id = coalesce(auth.uid()::text, 'guest'));