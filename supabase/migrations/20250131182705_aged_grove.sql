/*
  # Add emoji column to resources table

  1. Changes
    - Add emoji column to resources table
    - Update existing resources with appropriate emojis
*/

ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS emoji text NOT NULL DEFAULT '🌳';

-- Update existing resources with their appropriate emojis
UPDATE resources 
SET emoji = CASE 
  WHEN resource_type = 'wood' THEN '🌳'
  WHEN resource_type = 'stone' THEN '⛰️'
  WHEN resource_type = 'iron' THEN '⚒️'
  WHEN resource_type = 'diamond' THEN '💎'
END;

-- Rename resource_type to type to match the code
ALTER TABLE resources 
RENAME COLUMN resource_type TO type;