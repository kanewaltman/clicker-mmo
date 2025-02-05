/*
  # Fix resource gathering system

  1. Changes
    - Drop existing policies
    - Create new policies that handle both guests and authenticated users
    - Remove gatherer_id check for deletion to allow resource depletion
    - Simplify policy conditions

  2. Security
    - Maintains RLS for resource gathering
    - Allows both guest and authenticated users to gather resources
    - Preserves claim system functionality
*/

-- First drop all policies
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Anyone can gather resources" ON resources;
DROP POLICY IF EXISTS "Anyone can delete resources" ON resources;

-- Create new policies
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
    -- When claiming: must be unclaimed and set to self
    (gatherer_id IS NULL AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    -- When updating: must own the claim
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id = coalesce(auth.uid()::text, 'guest')) OR
    -- When releasing: must own the claim and set to null
    (gatherer_id = coalesce(auth.uid()::text, 'guest') AND NEW.gatherer_id IS NULL)
  );

-- Allow anyone to delete resources (needed for resource depletion)
CREATE POLICY "Anyone can delete resources"
  ON resources
  FOR DELETE
  TO public
  USING (true);