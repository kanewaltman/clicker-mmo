// Resource balancing configuration
export const RESOURCE_BALANCE = {
  targetResourceCount: 200, // Total number of resources to maintain
  maxDistance: 10000, // Increased maximum distance from castle (0,0)
  checkInterval: 2000, // Check every 2 seconds
  spawnBatchSize: 5, // Increased to spawn more resources at once
  densityAllowance: 0.2, // 20% variance allowed
  // Dynamic spawn rate based on deficit
  spawnRateMultiplier: (currentCount: number, targetCount: number) => {
    const deficit = targetCount - currentCount;
    if (deficit <= 0) return 1;
    // Increase spawn rate more aggressively when deficit is larger
    return Math.min(10, 1 + (deficit / targetCount) * 2);
  },
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
  spawnRate: number;
} {
  // Only count resources within maxDistance
  const inRange = resources.filter(resource => {
    const distance = Math.sqrt(
      Math.pow(resource.position.x, 2) + 
      Math.pow(resource.position.y, 2)
    );
    return distance <= RESOURCE_BALANCE.maxDistance;
  }).length;

  // Calculate allowance with a minimum of 5 resources
  const allowance = Math.max(
    5,
    Math.floor(RESOURCE_BALANCE.targetResourceCount * RESOURCE_BALANCE.densityAllowance)
  );
  const minAcceptable = RESOURCE_BALANCE.targetResourceCount - allowance;
  const maxAcceptable = RESOURCE_BALANCE.targetResourceCount + allowance;

  // Calculate spawn rate multiplier
  const spawnRate = RESOURCE_BALANCE.spawnRateMultiplier(inRange, RESOURCE_BALANCE.targetResourceCount);

  return {
    inRange,
    minAcceptable,
    maxAcceptable,
    deficit: Math.max(0, minAcceptable - inRange),
    excess: Math.max(0, inRange - maxAcceptable),
    spawnRate
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