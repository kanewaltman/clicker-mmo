// Resource spawn configuration
export interface ResourceSpawnConfig {
  type: 'wood' | 'stone' | 'iron' | 'diamond';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  emoji: string;
  weight: number; // Higher weight = more likely to spawn
  stats: {
    maxHealth: number;
    valuePerClick: number;
  };
}

export const LOOT_TABLE: ResourceSpawnConfig[] = [
  {
    type: 'wood',
    rarity: 'common',
    emoji: '🌳',
    weight: 100,
    stats: {
      maxHealth: 100,
      valuePerClick: 1
    }
  },
  {
    type: 'stone',
    rarity: 'uncommon',
    emoji: '⛰️',
    weight: 50,
    stats: {
      maxHealth: 200,
      valuePerClick: 2
    }
  },
  {
    type: 'iron',
    rarity: 'rare',
    emoji: '⚒️',
    weight: 25,
    stats: {
      maxHealth: 400,
      valuePerClick: 5
    }
  },
  {
    type: 'diamond',
    rarity: 'legendary',
    emoji: '💎',
    weight: 10,
    stats: {
      maxHealth: 1000,
      valuePerClick: 10
    }
  }
];

// Spawn area configuration
export const SPAWN_AREA = {
  minX: -500,
  maxX: 500,
  minY: -500,
  maxY: 500,
  minDistanceFromCenter: 100, // Minimum distance from town center
  gridSize: 100, // Size of each grid cell for density calculation
  maxAttemptsPerSpawn: 10 // Maximum attempts to find a low-density spot
};

// Calculate resource density in a given area
function calculateDensity(x: number, y: number, resources: { position: { x: number; y: number } }[]): number {
  const searchRadius = SPAWN_AREA.gridSize;
  return resources.filter(resource => {
    const dx = resource.position.x - x;
    const dy = resource.position.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= searchRadius;
  }).length;
}

export function getRandomSpawnPosition(existingResources: { position: { x: number; y: number } }[] = []): { x: number; y: number } {
  let bestPosition = null;
  let lowestDensity = Infinity;

  // Try multiple positions and pick the one with lowest resource density
  for (let attempt = 0; attempt < SPAWN_AREA.maxAttemptsPerSpawn; attempt++) {
    let x: number;
    let y: number;
    
    do {
      x = SPAWN_AREA.minX + Math.random() * (SPAWN_AREA.maxX - SPAWN_AREA.minX);
      y = SPAWN_AREA.minY + Math.random() * (SPAWN_AREA.maxY - SPAWN_AREA.minY);
    } while (Math.sqrt(x * x + y * y) < SPAWN_AREA.minDistanceFromCenter);

    const density = calculateDensity(x, y, existingResources);

    if (density < lowestDensity) {
      lowestDensity = density;
      bestPosition = { x, y };
    }

    // If we found a position with no nearby resources, use it immediately
    if (density === 0) {
      break;
    }
  }

  // If we couldn't find any position, use the best one we found
  return bestPosition || {
    x: SPAWN_AREA.minX + Math.random() * (SPAWN_AREA.maxX - SPAWN_AREA.minX),
    y: SPAWN_AREA.minY + Math.random() * (SPAWN_AREA.maxY - SPAWN_AREA.minY)
  };
}

export function selectRandomResource(): ResourceSpawnConfig {
  const totalWeight = LOOT_TABLE.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const resource of LOOT_TABLE) {
    random -= resource.weight;
    if (random <= 0) {
      return resource;
    }
  }
  
  return LOOT_TABLE[0]; // Fallback to first item
}