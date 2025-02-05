// Resource balancing configuration
export const RESOURCE_BALANCE = {
  targetResourceCount: 20, // Total number of resources to maintain
  maxDistance: 800, // Maximum distance from castle (0,0)
  checkInterval: 10000, // Increased to 10 seconds to reduce check frequency
  spawnBatchSize: 2, // Reduced batch size to prevent large spawns
  densityAllowance: 0.3, // Increased to 30% variance to reduce spawn/despawn cycles
  // Distribution of resource types (must sum to 1)
  distribution: {
    common: 0.5,    // 50% common
    uncommon: 0.3,  // 30% uncommon
    rare: 0.15,     // 15% rare
    legendary: 0.05 // 5% legendary
  }
} as const;

// Calculate the acceptable range for resources
export function calculateResourceRange(resources: { position: { x: number; y: number } }[]): {
  inRange: number;
  minAcceptable: number;
  maxAcceptable: number;
  deficit: number;
  excess: number;
} {
  // Only count resources within maxDistance
  const inRange = resources.filter(resource => {
    const distance = Math.sqrt(
      Math.pow(resource.position.x, 2) + 
      Math.pow(resource.position.y, 2)
    );
    return distance <= RESOURCE_BALANCE.maxDistance;
  }).length;

  // Calculate allowance with a minimum of 2 resources
  const allowance = Math.max(
    2,
    Math.floor(RESOURCE_BALANCE.targetResourceCount * RESOURCE_BALANCE.densityAllowance)
  );
  const minAcceptable = RESOURCE_BALANCE.targetResourceCount - allowance;
  const maxAcceptable = RESOURCE_BALANCE.targetResourceCount + allowance;

  return {
    inRange,
    minAcceptable,
    maxAcceptable,
    // Add gradual deficit/excess calculation
    deficit: Math.min(
      RESOURCE_BALANCE.spawnBatchSize,
      Math.max(0, minAcceptable - inRange)
    ),
    excess: Math.min(
      RESOURCE_BALANCE.spawnBatchSize,
      Math.max(0, inRange - maxAcceptable)
    )
  };
}

export function getResourceTypeByProbability(): 'common' | 'uncommon' | 'rare' | 'legendary' {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [type, probability] of Object.entries(RESOURCE_BALANCE.distribution)) {
    cumulative += probability;
    if (rand <= cumulative) {
      return type as 'common' | 'uncommon' | 'rare' | 'legendary';
    }
  }
  
  return 'common'; // Fallback
}