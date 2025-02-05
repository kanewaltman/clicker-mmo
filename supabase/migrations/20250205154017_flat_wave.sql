/*
  # Fix gatherer_id type for guest users

  1. Changes
    - Change gatherer_id column type from UUID to TEXT
    - Update policies to work with text-based gatherer_id
    - Remove any remaining UUID-specific constraints

  2. Security
    - RLS policies remain in place
    - Anyone can claim and update resources
    - Claims are still automatically released after timeout
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Anyone can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Anyone can delete claimed resources" ON resources;

-- Change gatherer_id type to text
ALTER TABLE resources
ALTER COLUMN gatherer_id TYPE text USING gatherer_id::text;

-- Create new policies with text comparison
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can claim and update resources"
  ON resources
  FOR UPDATE
  TO public
  USING (
    -- Can update if resource is unclaimed or owned by the claimer
    gatherer_id IS NULL OR 
    gatherer_id = coalesce(auth.uid()::text, 'guest')
  )
  WITH CHECK (
    -- When claiming: must be unclaimed and set to self
    (gatherer_id IS NULL AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    -- When updating: must own the claim
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    -- When releasing: must own the claim and set to null
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id IS NULL)
  );

CREATE POLICY "Anyone can delete claimed resources"
  ON resources
  FOR DELETE
  TO public
  USING (gatherer_id = coalesce(auth.uid()::text, 'guest'));