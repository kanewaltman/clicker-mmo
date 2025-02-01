// Resource balancing configuration
export const RESOURCE_BALANCE = {
  targetResourceCount: 20, // Total number of resources to maintain
  maxDistance: 800, // Maximum distance from castle (0,0)
  checkInterval: 5000, // How often to check/adjust resource count (ms)
  spawnBatchSize: 3, // How many resources to spawn at once if below target
  // Distribution of resource types (must sum to 1)
  distribution: {
    common: 0.5,    // 50% common
    uncommon: 0.3,  // 30% uncommon
    rare: 0.15,     // 15% rare
    legendary: 0.05 // 5% legendary
  }
} as const;

export function calculateResourceDeficit(
  resources: { position: { x: number; y: number } }[],
  maxDistance: number
): number {
  const inRangeCount = resources.filter(resource => {
    const distance = Math.sqrt(
      Math.pow(resource.position.x, 0) + 
      Math.pow(resource.position.y, 0)
    );
    return distance <= maxDistance;
  }).length;

  return Math.max(0, RESOURCE_BALANCE.targetResourceCount - inRangeCount);
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