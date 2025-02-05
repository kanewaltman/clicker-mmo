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
  minDistanceFromCenter: 200, // Castle's no-spawn radius
  gridSize: 100, // Size of each grid cell for density calculation
  maxAttemptsPerSpawn: 15, // Increased attempts for better positioning
  minSpacing: 50, // Minimum spacing between any resources
  clusterChance: 0.3, // 30% chance to create a cluster
  clusterRadius: 120, // Radius for resource clusters (reduced from 200)
  clusterMinSpacing: 80, // Minimum spacing within clusters
  maxClusterSize: 5, // Maximum resources in a cluster
  spawnRadius: 450 // Visual indicator for spawn area (slightly less than world bounds)
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
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const angle = Math.random() * Math.PI * 2;
    // Use minSpacing as minimum distance and radius as maximum
    const distance = minSpacing + (Math.random() * (radius - minSpacing));
    const x = baseX + Math.cos(angle) * distance;
    const y = baseY + Math.sin(angle) * distance;
    
    // Check if position is within world bounds and spawn radius
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    if (x >= SPAWN_AREA.minX && x <= SPAWN_AREA.maxX && 
        y >= SPAWN_AREA.minY && y <= SPAWN_AREA.maxY &&
        distanceFromCenter <= SPAWN_AREA.spawnRadius) {
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
  const createCluster = Math.random() < SPAWN_AREA.clusterChance && existingResources.length > 0;
  
  if (createCluster) {
    // Group resources by type
    const resourcesByType = existingResources.reduce((acc, resource) => {
      if (!acc[resource.type]) acc[resource.type] = [];
      acc[resource.type].push(resource);
      return acc;
    }, {} as Record<string, ResourceWithType[]>);

    // Find types that have room for more in their clusters
    const availableTypes = Object.entries(resourcesByType).filter(([_, resources]) => {
      const maxClusterSize = Math.min(SPAWN_AREA.maxClusterSize, resources.length + 3);
      return resources.length < maxClusterSize;
    });

    if (availableTypes.length > 0) {
      // Randomly select a type to cluster
      const [selectedType, typeResources] = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const baseResource = typeResources[Math.floor(Math.random() * typeResources.length)];
      
      let bestPosition = null;
      let bestScore = -Infinity;
      
      for (let attempt = 0; attempt < SPAWN_AREA.maxAttemptsPerSpawn; attempt++) {
        const pos = getRandomNearbyPosition(
          baseResource.position.x,
          baseResource.position.y,
          SPAWN_AREA.clusterRadius,
          SPAWN_AREA.clusterMinSpacing
        );
        
        // Check distance from castle
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        if (distanceFromCenter < SPAWN_AREA.minDistanceFromCenter) continue;
        
        // Check spacing
        const minDistance = getMinDistanceToResources(pos.x, pos.y, existingResources);
        const sameTypeDistance = getMinDistanceToSameType(pos.x, pos.y, selectedType, existingResources);
        
        // Score based on spacing and cluster cohesion
        const score = minDistance + (sameTypeDistance < SPAWN_AREA.clusterRadius ? 50 : 0);
        
        if (score > bestScore && 
            minDistance >= SPAWN_AREA.minSpacing && 
            sameTypeDistance >= SPAWN_AREA.clusterMinSpacing) {
          bestScore = score;
          bestPosition = pos;
        }
      }
      
      if (bestPosition) return bestPosition;
    }
  }
  
  // Regular spawn logic with improved spacing
  let bestPosition = null;
  let bestScore = -Infinity;
  
  for (let attempt = 0; attempt < SPAWN_AREA.maxAttemptsPerSpawn; attempt++) {
    let x: number;
    let y: number;
    let distance: number;
    
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * SPAWN_AREA.spawnRadius;
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
      distance = Math.sqrt(x * x + y * y);
    } while (distance < SPAWN_AREA.minDistanceFromCenter);
    
    const minDistance = getMinDistanceToResources(x, y, existingResources);
    const density = calculateDensity(x, y, existingResources);
    
    // Score based on spacing and density
    const score = minDistance - (density * 15);
    
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
    
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * SPAWN_AREA.spawnRadius;
      x = Math.cos(angle) * r;
      y = Math.sin(angle) * r;
      distance = Math.sqrt(x * x + y * y);
      minDistance = getMinDistanceToResources(x, y, existingResources);
    } while (
      distance < SPAWN_AREA.minDistanceFromCenter || 
      minDistance < SPAWN_AREA.minSpacing
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