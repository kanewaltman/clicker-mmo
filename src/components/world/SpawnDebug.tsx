import React from 'react';
import { SPAWN_AREA } from '../../config/lootTable';
import { TOWN_RADIUS } from './constants';
import { useGameStore } from '../../store/gameStore';
import { supabase } from '../../lib/supabase';

interface SpawnDebugProps {
  worldPosition: { x: number; y: number };
}

export const SpawnDebug: React.FC<SpawnDebugProps> = ({ worldPosition }) => {
  const { worldResources } = useGameStore();

  const isValidPosition = (x: number, y: number, existingPositions: Array<{x: number, y: number}> = []): boolean => {
    // Check distance from existing resources
    for (const resource of worldResources) {
      const dx = resource.position.x - x;
      const dy = resource.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < SPAWN_AREA.minSpacing) {
        return false;
      }
    }

    // Check distance from positions in current cluster
    for (const pos of existingPositions) {
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < SPAWN_AREA.clusterMinSpacing) {
        return false;
      }
    }

    // Check if within world bounds
    if (x < SPAWN_AREA.minX || x > SPAWN_AREA.maxX || 
        y < SPAWN_AREA.minY || y > SPAWN_AREA.maxY) {
      return false;
    }

    // Check distance from center (castle)
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    if (distanceFromCenter < SPAWN_AREA.minDistanceFromCenter) {
      return false;
    }

    return true;
  };

  const findValidClusterPosition = (
    baseX: number, 
    baseY: number, 
    existingPositions: Array<{x: number, y: number}> = []
  ): { x: number, y: number } | null => {
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const clusterAngle = Math.random() * Math.PI * 2;
      const clusterDistance = Math.random() * SPAWN_AREA.clusterRadius;
      const x = baseX + Math.cos(clusterAngle) * clusterDistance;
      const y = baseY + Math.sin(clusterAngle) * clusterDistance;

      if (isValidPosition(x, y, existingPositions)) {
        return { x, y };
      }
    }

    return null;
  };

  const handleForceCluster = async () => {
    try {
      // Find valid base position for cluster
      let baseX: number, baseY: number;
      let isValidBase = false;
      const maxBaseAttempts = 50;
      let baseAttempt = 0;

      do {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (SPAWN_AREA.spawnRadius - SPAWN_AREA.minDistanceFromCenter) + SPAWN_AREA.minDistanceFromCenter;
        baseX = Math.cos(angle) * distance;
        baseY = Math.sin(angle) * distance;
        isValidBase = isValidPosition(baseX, baseY);
        baseAttempt++;
      } while (!isValidBase && baseAttempt < maxBaseAttempts);

      if (!isValidBase) {
        console.warn('Could not find valid base position for cluster');
        return;
      }

      // Create 3-5 resources in the cluster
      const clusterSize = Math.floor(Math.random() * 3) + 3;
      const spawnPromises = [];
      const clusterPositions: Array<{x: number, y: number}> = [{ x: baseX, y: baseY }];

      // Random resource type for the cluster
      const types = ['wood', 'stone', 'iron', 'diamond'];
      const clusterType = types[Math.floor(Math.random() * types.length)];

      // Spawn first resource at base position
      spawnPromises.push(
        supabase
          .from('resources')
          .insert({
            type: clusterType,
            rarity: clusterType === 'wood' ? 'common' : 
                    clusterType === 'stone' ? 'uncommon' :
                    clusterType === 'iron' ? 'rare' : 'legendary',
            position_x: baseX,
            position_y: baseY,
            max_health: clusterType === 'wood' ? 100 :
                       clusterType === 'stone' ? 200 :
                       clusterType === 'iron' ? 400 : 1000,
            current_health: clusterType === 'wood' ? 100 :
                          clusterType === 'stone' ? 200 :
                          clusterType === 'iron' ? 400 : 1000,
            value_per_click: clusterType === 'wood' ? 1 :
                            clusterType === 'stone' ? 2 :
                            clusterType === 'iron' ? 5 : 10,
            emoji: clusterType === 'wood' ? '🌳' :
                   clusterType === 'stone' ? '⛰️' :
                   clusterType === 'iron' ? '⚒️' : '💎',
            created_at: new Date().toISOString()
          })
          .select()
      );

      // Try to spawn remaining resources
      for (let i = 1; i < clusterSize; i++) {
        const position = findValidClusterPosition(baseX, baseY, clusterPositions);
        
        if (position) {
          clusterPositions.push(position);
          spawnPromises.push(
            supabase
              .from('resources')
              .insert({
                type: clusterType,
                rarity: clusterType === 'wood' ? 'common' : 
                        clusterType === 'stone' ? 'uncommon' :
                        clusterType === 'iron' ? 'rare' : 'legendary',
                position_x: position.x,
                position_y: position.y,
                max_health: clusterType === 'wood' ? 100 :
                           clusterType === 'stone' ? 200 :
                           clusterType === 'iron' ? 400 : 1000,
                current_health: clusterType === 'wood' ? 100 :
                              clusterType === 'stone' ? 200 :
                              clusterType === 'iron' ? 400 : 1000,
                value_per_click: clusterType === 'wood' ? 1 :
                                clusterType === 'stone' ? 2 :
                                clusterType === 'iron' ? 5 : 10,
                emoji: clusterType === 'wood' ? '🌳' :
                       clusterType === 'stone' ? '⛰️' :
                       clusterType === 'iron' ? '⚒️' : '💎',
                created_at: new Date().toISOString()
              })
              .select()
          );
        }
      }

      await Promise.all(spawnPromises);
    } catch (error) {
      console.error('Error spawning cluster:', error);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* World bounds */}
      <div
        className="absolute border-2 border-blue-500/30"
        style={{
          left: SPAWN_AREA.minX + worldPosition.x,
          top: SPAWN_AREA.minY + worldPosition.y,
          width: SPAWN_AREA.maxX - SPAWN_AREA.minX,
          height: SPAWN_AREA.maxY - SPAWN_AREA.minY
        }}
      />

      {/* Spawn radius */}
      <div
        className="absolute rounded-full border-2 border-green-500/30"
        style={{
          left: worldPosition.x,
          top: worldPosition.y,
          width: SPAWN_AREA.spawnRadius * 2,
          height: SPAWN_AREA.spawnRadius * 2,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Castle no-spawn zone */}
      <div
        className="absolute rounded-full bg-red-500/20 border-2 border-red-500/30"
        style={{
          left: worldPosition.x,
          top: worldPosition.y,
          width: SPAWN_AREA.minDistanceFromCenter * 2,
          height: SPAWN_AREA.minDistanceFromCenter * 2,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute"
        style={{
          left: SPAWN_AREA.minX + worldPosition.x,
          top: SPAWN_AREA.minY + worldPosition.y,
          width: SPAWN_AREA.maxX - SPAWN_AREA.minX,
          height: SPAWN_AREA.maxY - SPAWN_AREA.minY,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${SPAWN_AREA.gridSize}px ${SPAWN_AREA.gridSize}px`
        }}
      />

      {/* Example cluster visualization */}
      <div
        className="absolute rounded-full border-2 border-yellow-500/30"
        style={{
          left: worldPosition.x + 300, // Example offset
          top: worldPosition.y + 300,
          width: SPAWN_AREA.clusterRadius * 2,
          height: SPAWN_AREA.clusterRadius * 2,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Legend */}
      <div className="fixed top-4 left-4 bg-gray-800/90 p-4 rounded-lg space-y-2 z-50">
        <h3 className="text-white font-bold mb-4">Spawn Area Debug</h3>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500/30" />
          <span className="text-white text-sm">World Bounds ({SPAWN_AREA.maxX * 2}px)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green-500/30" />
          <span className="text-white text-sm">Spawn Radius ({SPAWN_AREA.spawnRadius}px)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500/20 border-2 border-red-500/30" />
          <span className="text-white text-sm">No-Spawn Zone ({SPAWN_AREA.minDistanceFromCenter}px)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-yellow-500/30" />
          <span className="text-white text-sm">Cluster Range ({SPAWN_AREA.clusterRadius}px)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/10" />
          <span className="text-white text-sm">Density Grid ({SPAWN_AREA.gridSize}px)</span>
        </div>
        <div className="text-gray-400 text-xs mt-2">
          <div>Resource Spacing:</div>
          <div className="ml-2">• Min Distance: {SPAWN_AREA.minSpacing}px</div>
          <div className="ml-2">• Cluster Min: {SPAWN_AREA.clusterMinSpacing}px</div>
          <div>Cluster Settings:</div>
          <div className="ml-2">• Chance: {SPAWN_AREA.clusterChance * 100}%</div>
          <div className="ml-2">• Max Size: {SPAWN_AREA.maxClusterSize}</div>
        </div>
        <button
          onClick={handleForceCluster}
          className="mt-4 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded pointer-events-auto w-full transition-colors"
        >
          Force Spawn Cluster
        </button>
      </div>
    </div>
  );
};