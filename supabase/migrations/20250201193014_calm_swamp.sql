-- Add gatherer_id column to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS gatherer_id uuid REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS resources_gatherer_id_idx ON resources(gatherer_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can update resources" ON resources;

CREATE POLICY "Users can update resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (
    gatherer_id IS NULL OR 
    gatherer_id = auth.uid()
  )
  WITH CHECK (
    (gatherer_id IS NULL AND NEW.gatherer_id = auth.uid()) OR
    (gatherer_id = auth.uid() AND (NEW.gatherer_id = auth.uid() OR NEW.gatherer_id IS NULL))
  );

-- Add function to automatically release stale claims
CREATE OR REPLACE FUNCTION release_stale_claims()
RETURNS void AS $$
BEGIN
  UPDATE resources
  SET gatherer_id = NULL
  WHERE gatherer_id IS NOT NULL
  AND updated_at < NOW() - INTERVAL '5 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to release stale claims
CREATE OR REPLACE FUNCTION auto_release_claims()
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

CREATE TRIGGER release_stale_claims_trigger
  AFTER UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION auto_release_claims();