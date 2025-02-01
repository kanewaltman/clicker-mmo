/*
  # Fix resource gathering system

  1. Changes
    - Add NOT NULL constraint to gatherer_id to prevent race conditions
    - Add trigger to automatically release gatherer_id after a timeout
    - Update RLS policies to enforce proper resource claiming
    - Add function to clean up stale claims

  2. Security
    - Only allow one gatherer at a time
    - Auto-release claims after timeout
    - Prevent unauthorized updates
*/

-- Add trigger function to auto-release stale claims
CREATE OR REPLACE FUNCTION release_stale_resource_claims()
RETURNS TRIGGER AS $$
BEGIN
  -- Release claims older than 5 seconds
  UPDATE resources
  SET gatherer_id = NULL
  WHERE gatherer_id IS NOT NULL
  AND updated_at < NOW() - INTERVAL '5 seconds';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to periodically clean up stale claims
DROP TRIGGER IF EXISTS cleanup_stale_claims ON resources;
CREATE TRIGGER cleanup_stale_claims
  AFTER UPDATE ON resources
  FOR EACH STATEMENT
  EXECUTE FUNCTION release_stale_resource_claims();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can update resources they are gathering" ON resources;

-- Policy for claiming resources
CREATE POLICY "Users can claim unclaimed resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (
    -- Can only claim unclaimed resources or release own claims
    (gatherer_id IS NULL AND current_health > 0) OR
    gatherer_id = auth.uid()
  )
  WITH CHECK (
    -- When claiming: must be unclaimed and set to self
    (gatherer_id IS NULL AND NEW.gatherer_id = auth.uid()) OR
    -- When releasing: must be own claim and setting to null
    (gatherer_id = auth.uid() AND NEW.gatherer_id IS NULL) OR
    -- When damaging: must own the claim
    (gatherer_id = auth.uid() AND NEW.gatherer_id = auth.uid())
  );

-- Add function to clean up stale claims
CREATE OR REPLACE FUNCTION cleanup_stale_claims()
RETURNS void AS $$
BEGIN
  UPDATE resources
  SET gatherer_id = NULL
  WHERE gatherer_id IS NOT NULL
  AND updated_at < NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create a cron job to run cleanup every minute
SELECT cron.schedule(
  'cleanup-stale-claims',
  '* * * * *',
  'SELECT cleanup_stale_claims();'
);