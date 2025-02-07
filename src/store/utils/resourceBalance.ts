import { supabase } from '../../lib/supabase';
import { WorldResource } from '../slices/worldSlice';
import { RESOURCE_BALANCE, calculateResourceRange, getResourceTypeByProbability } from '../../config/resourceBalance';
import { getRandomSpawnPosition, LOOT_TABLE } from '../../config/lootTable';

export async function balanceResources(currentResources: WorldResource[]) {
  const { deficit, excess, spawnRate } = calculateResourceRange(currentResources);
  
  if (excess > 0) {
    const resourcesToRemove = currentResources
      .sort((a, b) => {
        const distanceA = Math.sqrt(Math.pow(a.position.x, 2) + Math.pow(a.position.y, 2));
        const distanceB = Math.sqrt(Math.pow(b.position.x, 2) + Math.pow(b.position.y, 2));
        
        if (Math.abs(distanceA - distanceB) > 50) {
          return distanceB - distanceA;
        }
        
        const timeA = a.created_at ? new Date(a.created_at).getTime() : Date.now();
        const timeB = b.created_at ? new Date(b.created_at).getTime() : Date.now();
        return timeA - timeB;
      })
      .slice(0, excess);

    for (const resource of resourcesToRemove) {
      try {
        await supabase
          .from('resources')
          .delete()
          .eq('id', resource.id);
      } catch (error) {
        console.error('Error removing excess resource:', error);
      }
    }
  } else if (deficit > 0) {
    // Delete all existing resources first
    try {
      await supabase
        .from('resources')
        .delete()
        .not('id', 'is', null);
    } catch (error) {
      console.error('Error clearing resources:', error);
    }

    // Calculate total resources to spawn
    const totalToSpawn = RESOURCE_BALANCE.targetResourceCount;
    const batchSize = 10; // Spawn in smaller batches to prevent timeouts
    const totalBatches = Math.ceil(totalToSpawn / batchSize);

    for (let batch = 0; batch < totalBatches; batch++) {
      const spawnPromises = [];
      const currentBatchSize = Math.min(batchSize, totalToSpawn - (batch * batchSize));

      for (let i = 0; i < currentBatchSize; i++) {
        const rarity = getResourceTypeByProbability();
        const resource = LOOT_TABLE.find(r => r.rarity === rarity);
        if (!resource) continue;

        const position = getRandomSpawnPosition([]);
        
        spawnPromises.push(
          supabase
            .from('resources')
            .insert({
              type: resource.type,
              rarity: resource.rarity,
              position_x: position.x,
              position_y: position.y,
              max_health: resource.stats.maxHealth,
              current_health: resource.stats.maxHealth,
              value_per_click: resource.stats.valuePerClick,
              emoji: resource.emoji,
              created_at: new Date().toISOString()
            })
            .select()
        );
      }

      try {
        await Promise.all(spawnPromises);
        // Add a small delay between batches to prevent overwhelming the database
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Error spawning batch:', error);
      }
    }
  }
}