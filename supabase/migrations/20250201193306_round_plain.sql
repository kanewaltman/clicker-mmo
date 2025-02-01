/*
  # Fix resource gathering system

  1. Changes
    - Ensure gatherer_id column exists
    - Add proper indexes
    - Update RLS policies
    - Add claim cleanup trigger

  2. Security
    - Only allow users to claim unclaimed resources
    - Auto-release stale claims after 5 seconds
    - Prevent concurrent claims on same resource
*/

-- Ensure gatherer_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'resources' 
    AND column_name = 'gatherer_id'
  ) THEN
    ALTER TABLE resources
    ADD COLUMN gatherer_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS resources_gatherer_id_idx ON resources(gatherer_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can update resources" ON resources;
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

-- Create function to release stale claims
CREATE OR REPLACE FUNCTION release_stale_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- Release claims older than 5 seconds
  UPDATE resources
  SET gatherer_id = NULL
  WHERE gatherer_id IS NOT NULL
  AND updated_at < NOW() - INTERVAL '5 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically release stale claims
DROP TRIGGER IF EXISTS auto_release_claims ON resources;
CREATE TRIGGER auto_release_claims
  AFTER UPDATE ON resources
  FOR EACH STATEMENT
  EXECUTE FUNCTION release_stale_claims();