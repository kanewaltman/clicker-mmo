/*
  # Add initial resources
  
  1. Initial Data
    - Adds starter resources of different types and rarities
    - Positions resources around the map
    - Sets appropriate health and value per click for each type
*/

-- Insert initial resources if they don't exist
INSERT INTO resources (type, rarity, position_x, position_y, max_health, current_health, value_per_click, emoji)
SELECT * FROM (
  VALUES 
    -- Common resources (wood)
    ('wood', 'common', 150, 100, 100, 100, 1, '🌳'),
    ('wood', 'common', -150, 150, 100, 100, 1, '🌳'),
    ('wood', 'common', 200, -100, 100, 100, 1, '🌳'),
    
    -- Uncommon resources (stone)
    ('stone', 'uncommon', 300, 200, 200, 200, 2, '⛰️'),
    ('stone', 'uncommon', -250, -200, 200, 200, 2, '⛰️'),
    
    -- Rare resources (iron)
    ('iron', 'rare', 400, -300, 400, 400, 5, '⚒️'),
    ('iron', 'rare', -350, 300, 400, 400, 5, '⚒️'),
    
    -- Legendary resources (diamond)
    ('diamond', 'legendary', 500, 400, 1000, 1000, 10, '💎'),
    ('diamond', 'legendary', -450, -400, 1000, 1000, 10, '💎')
) AS v (type, rarity, position_x, position_y, max_health, current_health, value_per_click, emoji)
WHERE NOT EXISTS (
    SELECT 1 FROM resources LIMIT 1
);