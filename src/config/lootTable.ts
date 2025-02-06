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
  minX: -Infinity,
  maxX: Infinity,
  minY: -Infinity,
  maxY: Infinity,
  minDistanceFromCenter: 200, // Castle's no-spawn radius
  gridSize: 100, // Size of each grid cell for density calculation
  maxAttemptsPerSpawn: 30, // Increased attempts for better positioning
  minSpacing: 100, // Minimum spacing between individual resources
  clusterChance: 0.3, // 30% chance to create a cluster
  clusterRadius: 150, // Radius for resource clusters
  clusterMinSpacing: 120, // Minimum spacing within clusters
  maxClusterSize: 5, // Maximum resources in a cluster
  spawnRadius: 2000 // Visual indicator for spawn area
};

interface ResourceWithType extends WorldResource {
  type: string;
  position: { x: number; y: number };
}

// Calculate minimum distance to nearest resource of any type
function getMinDistanceToResources(x: number, y: number, resources: { position: { x: number; y: number } }[]): number {
  if (resources.length === 0) return Infinity;
  
  return Math.min(...resources.map(resource => {
    const dx = resource.position.x - x;
    const dy = resource.position.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }));
}

// Calculate minimum distance to nearest resource of the same type
function getMinDistanceToSameType(x: number, y: number, type: string, resources: ResourceWithType[]): number {
  const sameTypeResources = resources.filter(r => r.type === type);
  if (sameTypeResources.length === 0) return Infinity;
  
  return Math.min(...sameTypeResources.map(resource => {
    const dx = resource.position.x - x;
    const dy = resource.position.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }));
}

// Calculate resource density in a given area
function calculateDensity(x: number, y: number, resources: { position: { x: number; y: number } }[]): number {
  const searchRadius = SPAWN_AREA.gridSize;
  return resources.filter(resource => {
    const dx = resource.position.x - x;
    const dy = resource.position.y - y;
    return Math.sqrt(dx * dx + dy * dy) <= searchRadius;
  }).length;
}

// Get a random position near another position with jitter
function getRandomNearbyPosition(baseX: number, baseY: number, radius: number, minSpacing: number): { x: number; y: number } {
  let attempts = 0;
  const maxAttempts = 20;
  
  while (attempts < maxAttempts) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minSpacing + (Math.random() * (radius - minSpacing));
    const x = baseX + Math.cos(angle) * distance;
    const y = baseY + Math.sin(angle) * distance;
    
    // Only check distance from center
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    if (distanceFromCenter >= SPAWN_AREA.minDistanceFromCenter) {
      return { x, y };
    }
    attempts++;
  }
  
  // Fallback to base position with minimum offset
  const fallbackAngle = Math.random() * Math.PI * 2;
  return {
    x: baseX + Math.cos(fallbackAngle) * minSpacing,
    y: baseY + Math.sin(fallbackAngle) * minSpacing
  };
}

export function getRandomSpawnPosition(existingResources: ResourceWithType[]): { x: number; y: number } {
  // Decide if we're creating a cluster
  const createCluster = Math.random() < SPAWN_AREA.clusterChance;
  
  if (createCluster && existingResources.length > 0) {
    // Try to find a valid cluster position
    let bestPosition = null;
    let bestScore = -Infinity;
    
    for (let attempt = 0; attempt < SPAWN_AREA.maxAttemptsPerSpawn; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 2000 + SPAWN_AREA.minDistanceFromCenter;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      const minDistance = getMinDistanceToResources(x, y, existingResources);
      const density = calculateDensity(x, y, existingResources);
      
      // Score based on spacing and density
      const score = minDistance - (density * 20);
      
      if (score > bestScore && minDistance >= SPAWN_AREA.minSpacing) {
        bestScore = score;
        bestPosition = { x, y };
      }
    }
    
    if (bestPosition) return bestPosition;
  }
  
  // Regular spawn logic (non-cluster or fallback)
  let bestPosition = null;
  let bestScore = -Infinity;
  
  for (let attempt = 0; attempt < SPAWN_AREA.maxAttemptsPerSpawn; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    // Use a larger radius for better distribution
    const r = Math.sqrt(Math.random()) * 2000 + SPAWN_AREA.minDistanceFromCenter;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    
    const minDistance = getMinDistanceToResources(x, y, existingResources);
    const density = calculateDensity(x, y, existingResources);
    
    // Score based on spacing and density
    const score = minDistance - (density * 20);
    
    if (score > bestScore && minDistance >= SPAWN_AREA.minSpacing) {
      bestScore = score;
      bestPosition = { x, y };
    }
  }
  
  // If we couldn't find a good position, ensure absolute minimum spacing
  if (!bestPosition) {
    let x: number;
    let y: number;
    let distance: number;
    let minDistance: number;
    let attempts = 0;
    
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 2000 + SPAWN_AREA.minDistanceFromCenter;
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
      distance = Math.sqrt(x * x + y * y);
      minDistance = getMinDistanceToResources(x, y, existingResources);
      attempts++;
    } while (
      (distance < SPAWN_AREA.minDistanceFromCenter || 
      minDistance < SPAWN_AREA.minSpacing / 2) && // Reduced spacing for fallback
      attempts < 50
    );
    
    bestPosition = { x, y };
  }
  
  return bestPosition;
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