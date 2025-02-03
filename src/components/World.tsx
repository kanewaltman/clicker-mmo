import React, { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Settings, Home } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { Shop } from './Shop';
import { ResourceNode } from './world/ResourceNode';
import { Structure } from './world/Structure';
import { PlayerCursor } from './world/PlayerCursor';
import { TownCenter } from './world/TownCenter';
import { Leaderboard } from './world/Leaderboard';
import { AllTimeLeaderboard } from './world/AllTimeLeaderboard';
import { useAFKDetection } from './world/hooks/useAFKDetection';
import { useCursorSync } from './world/hooks/useCursorSync';
import { useWorldControls } from './world/hooks/useWorldControls';
import {
  TOWN_CENTER,
  TOWN_RADIUS,
  STRUCTURE_DAMAGE,
  STRUCTURE_MAX_HEALTH
} from './world/constants';
import type { Structure as StructureType, WorldResource } from '../store/gameStore';

export const World: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [placingStructure, setPlacingStructure] = useState(false);
  const [isAFK, setIsAFK] = useState(false);
  const [draggingStructure, setDraggingStructure] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [leaderboardPosition, setLeaderboardPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 200 });
  const [isDraggingLeaderboard, setIsDraggingLeaderboard] = useState(false);
  const [leaderboardDragOffset, setLeaderboardDragOffset] = useState({ x: 0, y: 0 });
  
  const { 
    worldPosition,
    resources,
    username,
    cursorEmoji,
    inventory,
    structures,
    worldResources,
    afkTimeout,
    teleportToCastle,
    loadStructures,
    loadWorldResources
  } = useGameStore();
  
  const [userId] = useState(() => crypto.randomUUID());

  // Load initial state
  useEffect(() => {
    const initializeGameState = async () => {
      await Promise.all([
        loadStructures(),
        loadWorldResources()
      ]);
    };
    
    initializeGameState();
  }, [loadStructures, loadWorldResources]);

  const resetAFKTimer = useAFKDetection(afkTimeout, setIsAFK);
  const { cursors, updateCursorPosition } = useCursorSync(
    userId,
    isAFK,
    worldPosition,
    username,
    cursorEmoji,
    resources
  );

  useWorldControls(worldPosition, mousePosition, updateCursorPosition, resetAFKTimer);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    resetAFKTimer();
    const x = e.clientX;
    const y = e.clientY;
    setMousePosition({ x, y });
    updateCursorPosition(x, y);

    if (draggingStructure) {
      const rect = document.querySelector('.game-world')?.getBoundingClientRect();
      if (rect) {
        const worldX = e.clientX - rect.left - worldPosition.x - dragOffset.x;
        const worldY = e.clientY - rect.top - worldPosition.y - dragOffset.y;
        useGameStore.getState().updateStructurePosition(draggingStructure, worldX, worldY);
      }
    }

    if (isDraggingLeaderboard) {
      setLeaderboardPosition({
        x: Math.max(0, Math.min(window.innerWidth - 250, e.clientX - leaderboardDragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 150, e.clientY - leaderboardDragOffset.y))
      });
    }
  }, [resetAFKTimer, updateCursorPosition, draggingStructure, isDraggingLeaderboard, worldPosition, dragOffset, leaderboardDragOffset]);

  const handleMouseUp = useCallback(() => {
    if (draggingStructure) {
      setDraggingStructure(null);
    }
    if (isDraggingLeaderboard) {
      setIsDraggingLeaderboard(false);
    }
  }, [draggingStructure, isDraggingLeaderboard]);

  const handleClick = useCallback(() => {
    resetAFKTimer();
  }, [resetAFKTimer]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
    };
  }, [handleMouseMove, handleMouseUp, handleClick]);

  const handleResourceClick = async (resource: WorldResource) => {
    resetAFKTimer();
    await useGameStore.getState().damageResource(resource.id, 10);
  };

  const handlePlaceStructure = (e: React.MouseEvent) => {
    if (!placingStructure || inventory.pickaxes <= 0) return;
    resetAFKTimer();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - worldPosition.x;
    const y = e.clientY - rect.top - worldPosition.y;

    useGameStore.getState().placeStructure({
      type: 'pickaxe',
      position: { x, y },
      owner: userId,
      lastGather: Date.now()
    });

    setPlacingStructure(false);
  };

  const handleStructureMouseDown = (structure: StructureType, e: React.MouseEvent) => {
    e.stopPropagation();
    resetAFKTimer();

    if (structure.owner === userId) {
      setDraggingStructure(structure.id);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      });
    } else {
      useGameStore.getState().damageStructure(structure.id, STRUCTURE_DAMAGE);
      if (structure.health <= STRUCTURE_DAMAGE) {
        useGameStore.getState().removeStructure(structure.id);
      }
    }
  };

  const handleCastleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetAFKTimer();
    setIsShopOpen(true);
  };

  const handleLeaderboardMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingLeaderboard(true);
    setLeaderboardDragOffset({
      x: e.clientX - leaderboardPosition.x,
      y: e.clientY - leaderboardPosition.y
    });
  };

  const allPlayers = [
    { id: `local-${userId}`, username, points: resources, lastUpdate: Date.now() },
    ...cursors.map(c => ({ id: `remote-${c.id}`, username: c.username, points: c.points, lastUpdate: c.lastUpdate }))
  ];

  const topPlayers = allPlayers
    .filter(player => Date.now() - player.lastUpdate < 30000)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  const uniqueResources = Array.from(new Map(worldResources.map(r => [r.id, r])).values());

  return (
    <>
      {isAFK && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg text-white text-center">
            <h2 className="text-2xl font-bold mb-2">You are AFK</h2>
            <p className="text-gray-300">Move your mouse or press any key to resume</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors"
        >
          <Settings className="text-white" size={24} />
        </button>
      </div>

      <AllTimeLeaderboard />

      <Leaderboard
        position={leaderboardPosition}
        players={topPlayers}
        currentUserId={userId}
        onMouseDown={handleLeaderboardMouseDown}
      />

      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => {
            if (resources > 0) {
              teleportToCastle();
              resetAFKTimer();
            }
          }}
          className={`px-4 py-2 rounded flex items-center gap-2 ${
            resources > 0 
              ? 'bg-purple-600 hover:bg-purple-700' 
              : 'bg-gray-600 cursor-not-allowed'
          } text-white transition-colors group relative`}
          disabled={resources === 0}
        >
          <Home size={18} />
          Return
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap">
            <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
              💰 {Math.floor(resources * 0.5)}
            </span>
          </div>
        </button>

        {inventory.pickaxes > 0 && (
          <button
            onClick={() => setPlacingStructure(!placingStructure)}
            className={`px-4 py-2 rounded ${
              placingStructure ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {placingStructure ? 'Cancel' : 'Place Pickaxe'} ({inventory.pickaxes})
          </button>
        )}
      </div>

      <div 
        className="relative w-full h-full overflow-hidden bg-gray-900 game-world"
        onClick={handlePlaceStructure}
      >
        <TownCenter
          x={TOWN_CENTER.x}
          y={TOWN_CENTER.y}
          radius={TOWN_RADIUS}
          worldPosition={worldPosition}
          onClick={handleCastleClick}
        />

        <PlayerCursor
          x={mousePosition.x}
          y={mousePosition.y}
          emoji={cursorEmoji}
          username={username}
          resources={resources}
          isOwnCursor={true}
        />

        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${worldPosition.x}px, ${worldPosition.y}px)`,
            cursor: placingStructure ? 'crosshair' : 'default'
          }}
        >
          {uniqueResources.map((resource) => (
            <ResourceNode
              key={resource.id}
              resource={resource}
              onResourceClick={handleResourceClick}
            />
          ))}

          {structures.map((structure) => (
            <Structure
              key={structure.id}
              structure={structure}
              onMouseDown={handleStructureMouseDown}
              maxHealth={STRUCTURE_MAX_HEALTH}
            />
          ))}
          
          {cursors.map((cursor) => (
            <PlayerCursor
              key={cursor.id}
              x={cursor.currentX}
              y={cursor.currentY}
              emoji={cursor.emoji}
              username={cursor.username}
              resources={cursor.points}
              isOwnCursor={false}
              isAFK={cursor.isAFK}
            />
          ))}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </>
  );
};