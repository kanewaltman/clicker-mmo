/*
  # Resource System Implementation

  1. New Tables
    - `resources`
      - `id` (uuid, primary key)
      - `resource_type` (text) - resource type (wood, stone, iron, diamond)
      - `rarity` (text) - common, uncommon, rare, legendary
      - `position_x` (float)
      - `position_y` (float)
      - `max_health` (int)
      - `current_health` (int)
      - `value_per_click` (int)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `resources` table
    - Add policies for public access to resources
*/

DO $$ BEGIN
  DROP TABLE IF EXISTS resources CASCADE;
END $$;

CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
  position_x float NOT NULL,
  position_y float NOT NULL,
  max_health int NOT NULL,
  current_health int NOT NULL,
  value_per_click int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read resources
CREATE POLICY "Anyone can read resources"
  ON resources
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to update resources (for damaging)
CREATE POLICY "Anyone can update resources"
  ON resources
  FOR UPDATE
  TO public
  USING (true);

-- Initial resource data
INSERT INTO resources (resource_type, rarity, position_x, position_y, max_health, current_health, value_per_click)
VALUES 
  -- Common resources (wood)
  ('wood', 'common', 150, 100, 100, 100, 1),
  ('wood', 'common', -150, 150, 100, 100, 1),
  ('wood', 'common', 200, -100, 100, 100, 1),
  
  -- Uncommon resources (stone)
  ('stone', 'uncommon', 300, 200, 200, 200, 2),
  ('stone', 'uncommon', -250, -200, 200, 200, 2),
  
  -- Rare resources (iron)
  ('iron', 'rare', 400, -300, 400, 400, 5),
  ('iron', 'rare', -350, 300, 400, 400, 5),
  
  -- Legendary resources (diamond)
  ('diamond', 'legendary', 500, 400, 1000, 1000, 10),
  ('diamond', 'legendary', -450, -400, 1000, 1000, 10);