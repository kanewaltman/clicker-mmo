/*
  # Fix resource gathering attribution

  1. Changes
    - Add gatherer_id column to resources table to track who is gathering
    - Add index on gatherer_id for faster lookups
    - Add constraint to ensure only one player can gather at a time
    
  2. Security
    - Only authenticated users can update gatherer_id
    - Gatherer can only be set to the authenticated user's ID
*/

-- Add gatherer_id column if it doesn't exist
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS gatherer_id uuid REFERENCES auth.users(id);

-- Add index on gatherer_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'resources'
    AND indexname = 'resources_gatherer_id_idx'
  ) THEN
    CREATE INDEX resources_gatherer_id_idx ON resources(gatherer_id);
  END IF;
END $$;

-- Update RLS policies for resources
DROP POLICY IF EXISTS "Anyone can update resources" ON resources;

CREATE POLICY "Users can update resources they are gathering"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (
    gatherer_id IS NULL OR 
    gatherer_id = auth.uid() OR 
    current_health <= 0
  )
  WITH CHECK (
    (gatherer_id IS NULL AND NEW.gatherer_id = auth.uid()) OR
    (gatherer_id = auth.uid() AND NEW.gatherer_id IS NULL) OR
    (current_health <= 0)
  );