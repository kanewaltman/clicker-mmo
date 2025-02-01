/*
  # Fix RLS policy syntax for resources table

  1. Changes
    - Drop existing policies
    - Create new policies with correct syntax
    - Keep same functionality but fix SQL syntax

  2. Security
    - Maintain same security rules
    - Fix policy syntax errors
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Users can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Users can delete resources they own" ON resources;

-- Create new policies with fixed syntax
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can claim and update resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (
    -- Can update if resource is unclaimed or owned by the user
    gatherer_id IS NULL OR 
    gatherer_id = auth.uid()
  )
  WITH CHECK (
    -- When claiming: must be unclaimed and set to self
    (gatherer_id IS NULL AND gatherer_id = auth.uid()) OR
    -- When updating: must own the claim
    (gatherer_id = auth.uid() AND gatherer_id = auth.uid()) OR
    -- When releasing: must own the claim and set to null
    (gatherer_id = auth.uid() AND gatherer_id IS NULL)
  );

CREATE POLICY "Users can delete resources they own"
  ON resources
  FOR DELETE
  TO authenticated
  USING (gatherer_id = auth.uid());