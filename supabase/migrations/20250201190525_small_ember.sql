/*
  # Add resource constraints and indexes

  1. New Indexes
    - Index on resources.current_health for faster health queries
    - Index on user_progress.updated_at for faster sorting
  
  2. New Constraints
    - Ensure current_health <= max_health
    - Ensure value_per_click > 0
    - Ensure resource positions are within valid bounds
*/

-- Add index on current_health if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'resources'
    AND indexname = 'resources_current_health_idx'
  ) THEN
    CREATE INDEX resources_current_health_idx ON resources(current_health);
  END IF;
END $$;

-- Add index on updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'user_progress'
    AND indexname = 'user_progress_updated_at_idx'
  ) THEN
    CREATE INDEX user_progress_updated_at_idx ON user_progress(updated_at DESC);
  END IF;
END $$;

-- Add check constraints
ALTER TABLE resources
ADD CONSTRAINT check_current_health 
CHECK (current_health <= max_health),
ADD CONSTRAINT check_value_per_click 
CHECK (value_per_click > 0),
ADD CONSTRAINT check_position_bounds 
CHECK (
  position_x BETWEEN -1000 AND 1000 AND 
  position_y BETWEEN -1000 AND 1000
);

-- Add trigger to ensure current_health never exceeds max_health
CREATE OR REPLACE FUNCTION enforce_max_health()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_health > NEW.max_health THEN
    NEW.current_health := NEW.max_health;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'enforce_max_health_trigger'
  ) THEN
    CREATE TRIGGER enforce_max_health_trigger
      BEFORE INSERT OR UPDATE ON resources
      FOR EACH ROW
      EXECUTE FUNCTION enforce_max_health();
  END IF;
END $$;