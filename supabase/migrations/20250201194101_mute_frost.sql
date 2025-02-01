/*
  # Add gatherer_id to resources table

  1. Changes
    - Add gatherer_id column to resources table
    - Add foreign key reference to auth.users
    - Add index for better query performance
    - Add updated_at column for tracking claim timestamps
    - Add trigger for auto-updating updated_at

  2. Security
    - Foreign key ensures only valid user IDs can be stored
    - Index improves query performance for claim checks
*/

-- Add gatherer_id column if it doesn't exist
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

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'resources' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE resources
    ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS resources_gatherer_id_idx ON resources(gatherer_id);

-- Create or replace function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_resource_updated_at ON resources;
CREATE TRIGGER set_resource_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW
    EXECUTE FUNCTION update_resource_updated_at();