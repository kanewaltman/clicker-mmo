/*
  # Fix resource gathering for guest users

  1. Changes
    - Remove foreign key constraint on gatherer_id
    - Update policies to allow guest users to gather resources
    - Keep the gatherer_id column but make it nullable without FK constraint

  2. Security
    - RLS policies remain in place
    - Anyone can claim and update resources
    - Claims are still automatically released after timeout
*/

-- Remove the foreign key constraint
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_gatherer_id_fkey;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Users can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Users can delete resources they own" ON resources;

-- Create new policies that work for both authenticated and anonymous users
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
    gatherer_id::text = coalesce(auth.uid()::text, 'guest')
  )
  WITH CHECK (
    -- When claiming: must be unclaimed and set to self
    (gatherer_id IS NULL AND NEW.gatherer_id::text = coalesce(auth.uid()::text, 'guest')) OR
    -- When updating: must own the claim
    (gatherer_id::text = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id::text = coalesce(auth.uid()::text, 'guest')) OR
    -- When releasing: must own the claim and set to null
    (gatherer_id::text = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id IS NULL)
  );

CREATE POLICY "Anyone can delete claimed resources"
  ON resources
  FOR DELETE
  TO public
  USING (gatherer_id::text = coalesce(auth.uid()::text, 'guest'));