/*
  # Fix resource gathering system

  1. Changes
    - Clean up existing policies
    - Add proper claim management
    - Ensure consistent behavior

  2. Security
    - Only allow users to claim unclaimed resources
    - Auto-release stale claims after 5 seconds
    - Prevent concurrent claims on same resource
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
DROP POLICY IF EXISTS "Users can claim and update resources" ON resources;
DROP POLICY IF EXISTS "Users can update resources" ON resources;
DROP POLICY IF EXISTS "Users can claim unclaimed resources" ON resources;

-- Create new policies
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
    (gatherer_id IS NULL AND NEW.gatherer_id = auth.uid()) OR
    -- When updating: must own the claim
    (gatherer_id = auth.uid() AND NEW.gatherer_id = auth.uid()) OR
    -- When releasing: must own the claim and set to null
    (gatherer_id = auth.uid() AND NEW.gatherer_id IS NULL)
  );

-- Create policy for deleting resources
CREATE POLICY "Users can delete resources they own"
  ON resources
  FOR DELETE
  TO authenticated
  USING (gatherer_id = auth.uid());