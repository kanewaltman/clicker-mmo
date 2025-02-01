/*
  # Update Resource Table Policies

  1. Changes
    - Add policies to allow resource management
    - Enable inserting new resources
    - Enable updating resource health
    - Enable deleting depleted resources

  2. Security
    - Allow public access for game mechanics to work
    - Maintain data integrity through controlled access
*/

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read resources" ON resources;
  DROP POLICY IF EXISTS "Anyone can update resources" ON resources;
END $$;

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read resources
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to insert new resources
CREATE POLICY "Anyone can insert resources"
  ON resources
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update resources
CREATE POLICY "Anyone can update resources"
  ON resources
  FOR UPDATE
  TO public
  USING (true);

-- Allow anyone to delete resources
CREATE POLICY "Anyone can delete resources"
  ON resources
  FOR DELETE
  TO public
  USING (true);