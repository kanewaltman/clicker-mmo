import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { MobileMenu } from './MobileMenu';
import { useAFKDetection } from './world/hooks/useAFKDetection';
import { useCursorSync } from './world/hooks/useCursorSync';
import { useWorldControls } from './world/hooks/useWorldControls';
import { SpawnDebug } from './world/SpawnDebug';
import { useSpatialPartitioning } from './world/hooks/useSpatialPartitioning';
import { useViewportCulling } from './world/hooks/useViewportCulling';
import {
  TOWN_CENTER,
  TOWN_RADIUS,
  STRUCTURE_DAMAGE,
  STRUCTURE_MAX_HEALTH
} from './world/constants';
import type { Structure as StructureType, WorldResource } from '../store/gameStore';

const World: React.FC = () => {
  const initRef = useRef(false);
  const positionInitRef = useRef(false);
  const userId = useRef(crypto.randomUUID()).current;
  const gameStore = useGameStore();

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [placingStructure, setPlacingStructure] = useState(false);
  const [isAFK, setIsAFK] = useState(false);
  const [draggingStructure, setDraggingStructure] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [leaderboardPosition, setLeaderboardPosition] = useState({ 
    x: window.innerWidth - 300, 
    y: window.innerHeight - 200 
  });
  const [isDraggingLeaderboard, setIsDraggingLeaderboard] = useState(false);
  const [leaderboardDragOffset, setLeaderboardDragOffset] = useState({ x: 0, y: 0 });
  const [showSpawnDebug, setShowSpawnDebug] = useState(false);

  const { isInViewport } = useViewportCulling();
  const { visibleResources, visibleStructures } = useSpatialPartitioning(
    gameStore.worldResources,
    gameStore.structures,
    gameStore.worldPosition
  );

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const initializeGameState = async () => {
        try {
          await Promise.all([
            gameStore.loadStructures(),
            gameStore.loadWorldResources()
          ]);
        } catch (error) {
          console.error('Failed to initialize game state:', error);
        }
      };
      initializeGameState();
    }

    // Set initial position from user's saved position
    if (!positionInitRef.current && gameStore.position) {
      positionInitRef.current = true;
      gameStore.setWorldPosition(gameStore.position.x, gameStore.position.y);
    }
  }, [gameStore.position]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setShowSpawnDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const resetAFKTimer = useAFKDetection(gameStore.afkTimeout, setIsAFK);

  const { cursors, updateCursorPosition } = useCursorSync(
    userId,
    isAFK,
    gameStore.worldPosition,
    gameStore.username,
    gameStore.cursorEmoji,
    gameStore.resources
  );

  const isObjectInCenter = useCallback((objectX: number, objectY: number, threshold = 50) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const rect = document.querySelector('.game-world')?.getBoundingClientRect();
    
    if (rect) {
      const worldX = centerX - rect.left - gameStore.worldPosition.x;
      const worldY = centerY - rect.top - gameStore.worldPosition.y;
      
      const dx = Math.abs(objectX - worldX);
      const dy = Math.abs(objectY - worldY);
      
      return dx < threshold && dy < threshold;
    }
    return false;
  }, [gameStore.worldPosition]);

  const handleCursorClick = useCallback(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const rect = document.querySelector('.game-world')?.getBoundingClientRect();
    
    if (rect) {
      const worldX = centerX - rect.left - gameStore.worldPosition.x;
      const worldY = centerY - rect.top - gameStore.worldPosition.y;
      
      // Check castle first
      const castleDistance = Math.sqrt(
        Math.pow(TOWN_CENTER.x - worldX, 2) + 
        Math.pow(TOWN_CENTER.y - worldY, 2)
      );
      
      if (castleDistance < 48) {
        setIsShopOpen(true);
        return;
      }

      // Then check structures
      const clickedStructure = gameStore.structures.find(structure => {
        const dx = structure.position.x - worldX;
        const dy = structure.position.y - worldY;
        return Math.sqrt(dx * dx + dy * dy) < 30;
      });

      if (clickedStructure) {
        if (clickedStructure.owner === userId) {
          setDraggingStructure(clickedStructure.id);
        } else {
          gameStore.damageStructure(clickedStructure.id, STRUCTURE_DAMAGE);
          if (clickedStructure.health <= STRUCTURE_DAMAGE) {
            gameStore.removeStructure(clickedStructure.id);
          }
        }
        return;
      }

      // Finally check resources
      const clickedResource = gameStore.worldResources.find(resource => {
        const dx = resource.position.x - worldX;
        const dy = resource.position.y - worldY;
        return Math.sqrt(dx * dx + dy * dy) < 50;
      });

      if (clickedResource) {
        handleResourceClick(clickedResource);
      }
    }
  }, [gameStore.worldPosition, gameStore.worldResources, gameStore.structures, userId]);

  useWorldControls(
    gameStore.worldPosition,
    mousePosition,
    updateCursorPosition,
    resetAFKTimer,
    setIsPanning,
    setCursorPosition,
    handleCursorClick
  );

  const handleMouseMove = useCallback((e: MouseEvent) => {
    resetAFKTimer();
    const x = e.clientX;
    const y = e.clientY;
    setMousePosition({ x, y });
    
    if (!isPanning) {
      setCursorPosition({ x, y });
      updateCursorPosition(x, y);
    }

    if (draggingStructure) {
      const rect = document.querySelector('.game-world')?.getBoundingClientRect();
      if (rect) {
        const worldX = e.clientX - rect.left - gameStore.worldPosition.x - dragOffset.x;
        const worldY = e.clientY - rect.top - gameStore.worldPosition.y - dragOffset.y;
        gameStore.updateStructurePosition(draggingStructure, worldX, worldY);
      }
    }

    if (isDraggingLeaderboard) {
      setLeaderboardPosition({
        x: Math.max(0, Math.min(window.innerWidth - 250, e.clientX - leaderboardDragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 150, e.clientY - leaderboardDragOffset.y))
      });
    }
  }, [
    resetAFKTimer,
    updateCursorPosition,
    draggingStructure,
    isDraggingLeaderboard,
    gameStore.worldPosition,
    dragOffset,
    leaderboardDragOffset,
    isPanning
  ]);

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
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
    };
  }, [handleMouseMove, handleMouseUp, handleClick]);

  const handleResourceClick = useCallback(async (resource: WorldResource) => {
    resetAFKTimer();
    await gameStore.damageResource(resource.id, 10);
  }, [resetAFKTimer]);

  const handlePlaceStructure = useCallback((e: React.MouseEvent) => {
    if (!placingStructure || gameStore.inventory.pickaxes <= 0) return;
    resetAFKTimer();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - gameStore.worldPosition.x;
    const y = e.clientY - rect.top - gameStore.worldPosition.y;

    gameStore.placeStructure({
      type: 'pickaxe',
      position: { x, y },
      owner: userId,
      lastGather: Date.now()
    });

    setPlacingStructure(false);
  }, [placingStructure, gameStore.inventory.pickaxes, gameStore.worldPosition, userId, resetAFKTimer]);

  const handleStructureMouseDown = useCallback((structure: StructureType, e: React.MouseEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    resetAFKTimer();

    if (structure.owner === userId) {
      setDraggingStructure(structure.id);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2)
      });
    } else {
      gameStore.damageStructure(structure.id, STRUCTURE_DAMAGE);
      if (structure.health <= STRUCTURE_DAMAGE) {
        gameStore.removeStructure(structure.id);
      }
    }
  }, [userId, resetAFKTimer]);

  const handleCastleClick = useCallback((e: React.MouseEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    resetAFKTimer();
    setIsShopOpen(true);
  }, [resetAFKTimer]);

  const handleLeaderboardMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingLeaderboard(true);
    setLeaderboardDragOffset({
      x: e.clientX - leaderboardPosition.x,
      y: e.clientY - leaderboardPosition.y
    });
  }, [leaderboardPosition]);

  const allPlayers = useMemo(() => {
    const localPlayer = { 
      id: `local-${userId}`, 
      username: gameStore.username, 
      points: gameStore.resources, 
      lastUpdate: Date.now() 
    };
    const remotePlayers = cursors.map(c => ({ 
      id: `remote-${c.id}`, 
      username: c.username, 
      points: c.points, 
      lastUpdate: c.lastUpdate 
    }));
    return [localPlayer, ...remotePlayers];
  }, [userId, gameStore.username, gameStore.resources, cursors]);

  const topPlayers = useMemo(() => {
    const now = Date.now();
    return allPlayers
      .filter(player => now - player.lastUpdate < 30000)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }, [allPlayers]);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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

      {!isMobile && (
        <>
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
                if (gameStore.resources > 0) {
                  gameStore.teleportToCastle();
                  resetAFKTimer();
                }
              }}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                gameStore.resources > 0 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-600 cursor-not-allowed'
              } text-white transition-colors group relative`}
              disabled={gameStore.resources === 0}
            >
              <Home size={18} />
              Return
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap">
                <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded">
                  💰 {Math.floor(gameStore.resources * 0.5)}
                </span>
              </div>
            </button>

            {gameStore.inventory.pickaxes > 0 && (
              <button
                onClick={() => setPlacingStructure(!placingStructure)}
                className={`px-4 py-2 rounded ${
                  placingStructure ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors`}
              >
                {placingStructure ? 'Cancel' : 'Place Pickaxe'} ({gameStore.inventory.pickaxes})
              </button>
            )}
          </div>
        </>
      )}

      {isMobile && (
        <MobileMenu
          onOpenShop={() => setIsShopOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      <div 
        className="relative w-full h-full overflow-hidden bg-gray-900 game-world"
        onClick={handlePlaceStructure}
      >
        {showSpawnDebug && (
          <SpawnDebug worldPosition={gameStore.worldPosition} />
        )}

        <TownCenter
          x={TOWN_CENTER.x}
          y={TOWN_CENTER.y}
          radius={TOWN_RADIUS}
          worldPosition={gameStore.worldPosition}
          onClick={handleCastleClick}
          isMobile={isMobile}
          isInCenter={isObjectInCenter(TOWN_CENTER.x, TOWN_CENTER.y, 48)}
        />

        {(!isPanning || !gameStore.hideCursorWhilePanning) && (
          <PlayerCursor
            x={cursorPosition.x}
            y={cursorPosition.y}
            emoji={gameStore.cursorEmoji}
            username={gameStore.username}
            resources={gameStore.resources}
            isOwnCursor={true}
          />
        )}

        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${gameStore.worldPosition.x}px, ${gameStore.worldPosition.y}px)`,
            cursor: placingStructure ? 'crosshair' : 'default'
          }}
        >
          {visibleResources.map((resource) => (
            <ResourceNode
              key={resource.id}
              resource={resource}
              onResourceClick={handleResourceClick}
              isMobile={isMobile}
              isInCenter={isObjectInCenter(resource.position.x, resource.position.y)}
            />
          ))}

          {visibleStructures.map((structure) => (
            <Structure
              key={structure.id}
              structure={structure}
              onMouseDown={handleStructureMouseDown}
              maxHealth={STRUCTURE_MAX_HEALTH}
              isMobile={isMobile}
              isInCenter={isObjectInCenter(structure.position.x, structure.position.y)}
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

      {isMobile && (
        <button
          onClick={() => setShowSpawnDebug(prev => !prev)}
          className="fixed bottom-20 right-4 z-[100] w-14 h-14 bg-stone-900 rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors md:hidden game-ui"
        >
          <span className="text-white text-2xl">🐞</span>
        </button>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </>
  );
};

export default World;

export { World }