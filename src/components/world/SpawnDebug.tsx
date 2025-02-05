import React, { useState } from 'react';
import { SPAWN_AREA } from '../../config/lootTable';
import { RESOURCE_BALANCE } from '../../config/resourceBalance';
import { TOWN_RADIUS } from './constants';
import { useGameStore } from '../../store/gameStore';
import { supabase } from '../../lib/supabase';

interface SpawnDebugProps {
  worldPosition: { x: number; y: number };
}

export const SpawnDebug: React.FC<SpawnDebugProps> = ({ worldPosition }) => {
  const { worldResources } = useGameStore();
  const [settings, setSettings] = useState({
    // Spawn Area Settings
    minDistanceFromCenter: SPAWN_AREA.minDistanceFromCenter,
    minSpacing: SPAWN_AREA.minSpacing,
    clusterChance: SPAWN_AREA.clusterChance,
    clusterRadius: SPAWN_AREA.clusterRadius,
    clusterMinSpacing: SPAWN_AREA.clusterMinSpacing,
    maxClusterSize: SPAWN_AREA.maxClusterSize,
    spawnRadius: SPAWN_AREA.spawnRadius,
    // Resource Balance Settings
    targetResourceCount: RESOURCE_BALANCE.targetResourceCount,
    checkInterval: RESOURCE_BALANCE.checkInterval,
    spawnBatchSize: RESOURCE_BALANCE.spawnBatchSize,
    densityAllowance: RESOURCE_BALANCE.densityAllowance
  });

  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'spawn' | 'balance'>('spawn');

  const handleSettingChange = (key: keyof typeof settings, value: number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleReset = async () => {
    if (isResetting) return;
    setIsResetting(true);

    try {
      // Delete all existing resources
      await supabase
        .from('resources')
        .delete()
        .not('id', 'is', null);

      // Update settings
      Object.assign(SPAWN_AREA, {
        minDistanceFromCenter: settings.minDistanceFromCenter,
        minSpacing: settings.minSpacing,
        clusterChance: settings.clusterChance,
        clusterRadius: settings.clusterRadius,
        clusterMinSpacing: settings.clusterMinSpacing,
        maxClusterSize: settings.maxClusterSize,
        spawnRadius: settings.spawnRadius
      });

      Object.assign(RESOURCE_BALANCE, {
        targetResourceCount: settings.targetResourceCount,
        checkInterval: settings.checkInterval,
        spawnBatchSize: settings.spawnBatchSize,
        densityAllowance: settings.densityAllowance
      });

      // Force spawn several clusters to repopulate
      const spawnPromises = [];
      for (let i = 0; i < 5; i++) {
        spawnPromises.push(handleForceCluster());
      }
      await Promise.all(spawnPromises);
    } catch (error) {
      console.error('Error resetting resources:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const isValidPosition = (x: number, y: number, existingPositions: Array<{x: number, y: number}> = []): boolean => {
    // Check distance from existing resources
    for (const resource of worldResources) {
      const dx = resource.position.x - x;
      const dy = resource.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < settings.minSpacing) {
        return false;
      }
    }

    // Check distance from positions in current cluster
    for (const pos of existingPositions) {
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < settings.clusterMinSpacing) {
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
    if (distanceFromCenter < settings.minDistanceFromCenter) {
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
      const clusterDistance = Math.random() * settings.clusterRadius;
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
        const distance = Math.random() * (settings.spawnRadius - settings.minDistanceFromCenter) + settings.minDistanceFromCenter;
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
          width: settings.spawnRadius * 2,
          height: settings.spawnRadius * 2,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Castle no-spawn zone */}
      <div
        className="absolute rounded-full bg-red-500/20 border-2 border-red-500/30"
        style={{
          left: worldPosition.x,
          top: worldPosition.y,
          width: settings.minDistanceFromCenter * 2,
          height: settings.minDistanceFromCenter * 2,
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
          left: worldPosition.x + 300,
          top: worldPosition.y + 300,
          width: settings.clusterRadius * 2,
          height: settings.clusterRadius * 2,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Settings Panel */}
      <div className="fixed top-4 left-4 bg-gray-800/90 p-4 rounded-lg space-y-4 z-50 pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h3 className="text-white font-bold mb-4">Spawn Area Debug</h3>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('spawn')}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              activeTab === 'spawn' 
                ? 'bg-blue-500/20 text-blue-300' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Spawn Settings
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              activeTab === 'balance' 
                ? 'bg-blue-500/20 text-blue-300' 
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Balance Settings
          </button>
        </div>
        
        <div className="space-y-4">
          {activeTab === 'spawn' ? (
            <>
              <div>
                <label className="text-white text-sm block mb-1">
                  Min Distance from Center: {settings.minDistanceFromCenter}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={settings.minDistanceFromCenter}
                  onChange={(e) => handleSettingChange('minDistanceFromCenter', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Min Resource Spacing: {settings.minSpacing}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings.minSpacing}
                  onChange={(e) => handleSettingChange('minSpacing', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Cluster Chance: {Math.round(settings.clusterChance * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.clusterChance * 100}
                  onChange={(e) => handleSettingChange('clusterChance', Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Cluster Radius: {settings.clusterRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="300"
                  value={settings.clusterRadius}
                  onChange={(e) => handleSettingChange('clusterRadius', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Cluster Min Spacing: {settings.clusterMinSpacing}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={settings.clusterMinSpacing}
                  onChange={(e) => handleSettingChange('clusterMinSpacing', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Max Cluster Size: {settings.maxClusterSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={settings.maxClusterSize}
                  onChange={(e) => handleSettingChange('maxClusterSize', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Spawn Radius: {settings.spawnRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="600"
                  value={settings.spawnRadius}
                  onChange={(e) => handleSettingChange('spawnRadius', Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-white text-sm block mb-1">
                  Target Resource Count: {settings.targetResourceCount}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={settings.targetResourceCount}
                  onChange={(e) => handleSettingChange('targetResourceCount', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Check Interval: {settings.checkInterval}ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={settings.checkInterval}
                  onChange={(e) => handleSettingChange('checkInterval', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Spawn Batch Size: {settings.spawnBatchSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.spawnBatchSize}
                  onChange={(e) => handleSettingChange('spawnBatchSize', Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-white text-sm block mb-1">
                  Density Allowance: {Math.round(settings.densityAllowance * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.densityAllowance * 100}
                  onChange={(e) => handleSettingChange('densityAllowance', Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleForceCluster}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-4 py-2 rounded transition-colors flex-1"
          >
            Force Spawn Cluster
          </button>
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? 'Resetting...' : 'Reset & Apply'}
          </button>
        </div>

        <div className="text-gray-400 text-xs mt-2">
          <div>Current Settings:</div>
          <div className="ml-2">• Min Distance: {settings.minSpacing}px</div>
          <div className="ml-2">• Cluster Min: {settings.clusterMinSpacing}px</div>
          <div>Cluster Settings:</div>
          <div className="ml-2">• Chance: {Math.round(settings.clusterChance * 100)}%</div>
          <div className="ml-2">• Max Size: {settings.maxClusterSize}</div>
          <div>Balance Settings:</div>
          <div className="ml-2">• Target Count: {settings.targetResourceCount}</div>
          <div className="ml-2">• Check Interval: {settings.checkInterval}ms</div>
          <div className="ml-2">• Batch Size: {settings.spawnBatchSize}</div>
          <div className="ml-2">• Density Allowance: {Math.round(settings.densityAllowance * 100)}%</div>
        </div>
      </div>
    </div>
  );
};