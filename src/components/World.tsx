import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import { Settings } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { Shop } from './Shop';
import type { Structure } from '../store/gameStore';

interface Cursor {
  id: string;
  x: number;
  y: number;
  username: string;
  emoji: string;
  points: number;
}

interface CursorWithInterpolation extends Cursor {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  lastUpdate: number;
}

const TOWN_CENTER = { x: 0, y: 0 };
const TOWN_RADIUS = 200;

const RESOURCES = [
  { emoji: '🌳', value: 1, x: 300, y: 100 },
  { emoji: '⛰️', value: 2, x: 400, y: 150 },
  { emoji: '💎', value: 5, x: 500, y: 200 },
];

const BROADCAST_INTERVAL = 50;
const INTERPOLATION_SPEED = 0.15;
const CURSOR_TIMEOUT = 5000;
const STRUCTURE_DAMAGE = 10;
const STRUCTURE_MAX_HEALTH = 1000;
const GATHER_INTERVAL = 2000;
const GATHER_AMOUNT = 1;
const AFK_TIMEOUT = 3000;

export const World: React.FC = () => {
  const [cursors, setCursors] = useState<CursorWithInterpolation[]>([]);
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
    setWorldPosition,
    addResources,
    resources,
    username,
    cursorEmoji,
    inventory,
    structures,
    placeStructure,
    damageStructure,
    removeStructure,
    afkTimeout
  } = useGameStore();
  
  const [userId] = useState(() => crypto.randomUUID());
  const channelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const afkTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if Ctrl key is pressed
      if (e.ctrlKey) {
        e.preventDefault();
        // Here you can add custom behavior for Ctrl + mousewheel if needed
        return false;
      }
    };

    // Add both event listeners to ensure cross-browser compatibility
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousewheel', handleWheel as any, { passive: false });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent zooming with Ctrl + Plus/Minus
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousewheel', handleWheel as any);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const resetAFKTimer = useCallback(() => {
    if (isAFK) {
      setIsAFK(false);
    }
    lastActivityRef.current = Date.now();
    
    if (afkTimeoutRef.current) {
      window.clearTimeout(afkTimeoutRef.current);
    }
    
    afkTimeoutRef.current = window.setTimeout(() => {
      setIsAFK(true);
    }, afkTimeout);
  }, [isAFK, afkTimeout]);

  const updateCursorPosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < BROADCAST_INTERVAL || isAFK) return;
    
    lastBroadcastRef.current = now;
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          id: userId,
          x: x - worldPosition.x,
          y: y - worldPosition.y,
          username,
          emoji: cursorEmoji,
          points: resources
        }
      });
    }
  }, [userId, worldPosition, username, cursorEmoji, resources, isAFK]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      structures.forEach(structure => {
        if (structure.owner === userId && structure.health > 0) {
          const now = Date.now();
          if (now - structure.lastGather >= GATHER_INTERVAL) {
            addResources(GATHER_AMOUNT);
            structure.lastGather = now;
          }
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [structures, addResources, userId]);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      
      setCursors(prevCursors => {
        const activeCursors = prevCursors.filter(
          cursor => now - cursor.lastUpdate < CURSOR_TIMEOUT
        );
        
        return activeCursors.map(cursor => ({
          ...cursor,
          currentX: cursor.currentX + (cursor.targetX - cursor.currentX) * INTERPOLATION_SPEED,
          currentY: cursor.currentY + (cursor.targetY - cursor.currentY) * INTERPOLATION_SPEED,
        }));
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel('cursors', {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (isAFK) return;
        
        const cursor = payload as Cursor;
        setCursors(prevCursors => {
          const now = Date.now();
          const existingIndex = prevCursors.findIndex(c => c.id === cursor.id);
          
          if (existingIndex >= 0) {
            const updated = [...prevCursors];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...cursor,
              targetX: cursor.x,
              targetY: cursor.y,
              lastUpdate: now
            };
            return updated;
          }
          
          return [...prevCursors, {
            ...cursor,
            currentX: cursor.x,
            currentY: cursor.y,
            targetX: cursor.x,
            targetY: cursor.y,
            lastUpdate: now
          }];
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId, isAFK]);

  useEffect(() => {
    const channel = supabase.channel('structures', {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on('broadcast', { event: 'structure_update' }, ({ payload }) => {
        if (isAFK) return;
        const { structures } = payload;
        useGameStore.getState().syncStructures(structures);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAFK]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsAFK(true);
      } else {
        resetAFKTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (afkTimeoutRef.current) {
        window.clearTimeout(afkTimeoutRef.current);
      }
    };
  }, [resetAFKTimer]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      resetAFKTimer();
      const MOVE_AMOUNT = 10;
      let newX = worldPosition.x;
      let newY = worldPosition.y;
      
      switch (e.key.toLowerCase()) {
        case 'w':
          newY += MOVE_AMOUNT;
          break;
        case 's':
          newY -= MOVE_AMOUNT;
          break;
        case 'a':
          newX += MOVE_AMOUNT;
          break;
        case 'd':
          newX -= MOVE_AMOUNT;
          break;
      }

      setWorldPosition(newX, newY);
      updateCursorPosition(mousePosition.x, mousePosition.y);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [worldPosition, setWorldPosition, updateCursorPosition, mousePosition, resetAFKTimer]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleResourceClick = (value: number) => {
    resetAFKTimer();
    addResources(value);
  };

  const handlePlaceStructure = (e: React.MouseEvent) => {
    if (!placingStructure || inventory.pickaxes <= 0) return;
    resetAFKTimer();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - worldPosition.x;
    const y = e.clientY - rect.top - worldPosition.y;

    placeStructure({
      type: 'pickaxe',
      position: { x, y },
      owner: userId,
      lastGather: Date.now()
    });

    setPlacingStructure(false);
  };

  const handleStructureMouseDown = (structure: Structure, e: React.MouseEvent) => {
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
      damageStructure(structure.id, STRUCTURE_DAMAGE);
      if (structure.health <= STRUCTURE_DAMAGE) {
        removeStructure(structure.id);
      }
    }
  };

  const handleCastleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetAFKTimer();
    
    // Add click animation by temporarily adding a class
    const castle = e.currentTarget as HTMLElement;
    castle.classList.add('scale-90');
    setTimeout(() => {
      castle.classList.remove('scale-90');
    }, 150);
    
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
    .filter(player => Date.now() - player.lastUpdate < CURSOR_TIMEOUT)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

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

      <div 
        className="fixed z-10 bg-gray-800/90 p-4 rounded-lg backdrop-blur-sm shadow-lg cursor-move"
        style={{
          left: leaderboardPosition.x,
          top: leaderboardPosition.y,
          minWidth: '250px'
        }}
        onMouseDown={handleLeaderboardMouseDown}
      >
        <h3 className="text-white font-bold mb-2 text-sm select-none">Top Players</h3>
        <div className="space-y-2">
          {topPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`flex items-center gap-2 text-sm select-none ${
                player.id === `local-${userId}` ? 'bg-blue-500/20 px-2 py-1 rounded -mx-2' : ''
              }`}
            >
              <span className="text-yellow-400 w-4">{index + 1}.</span>
              <span className="text-white">{player.username}</span>
              <span className="text-yellow-400">💰 {player.points}</span>
            </div>
          ))}
          {topPlayers.length === 0 && (
            <div className="text-gray-400 text-sm">No active players</div>
          )}
        </div>
      </div>

      {inventory.pickaxes > 0 && (
        <div className="absolute bottom-4 left-4 z-10">
          <button
            onClick={() => setPlacingStructure(!placingStructure)}
            className={`px-4 py-2 rounded ${
              placingStructure ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {placingStructure ? 'Cancel' : 'Place Pickaxe'} ({inventory.pickaxes})
          </button>
        </div>
      )}

      <div 
        className="relative w-full h-full overflow-hidden bg-gray-900 game-world"
        onClick={handlePlaceStructure}
      >
        <div
          className="absolute rounded-full border-4 border-yellow-500/30 pointer-events-none"
          style={{
            left: TOWN_CENTER.x + worldPosition.x - TOWN_RADIUS,
            top: TOWN_CENTER.y + worldPosition.y - TOWN_RADIUS,
            width: TOWN_RADIUS * 2,
            height: TOWN_RADIUS * 2
          }}
        />
        <div
          className="absolute cursor-pointer group"
          style={{
            left: TOWN_CENTER.x + worldPosition.x,
            top: TOWN_CENTER.y + worldPosition.y,
            transform: 'translate(-50%, -50%)',
            width: '96px',
            height: '96px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={handleCastleClick}
        >
          <div className="text-6xl transition-all duration-200 ease-in-out transform group-hover:scale-110 active:scale-90 active:transition-none">
            🏰
          </div>
        </div>

        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex flex-col items-center">
            <span className="text-2xl select-none">{cursorEmoji}</span>
            <div className="flex items-center gap-2 mt-1 absolute top-[100%]">
              <span className="text-xs text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap">{username}</span>
              <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded whitespace-nowrap">💰 {resources}</span>
            </div>
          </div>
        </div>

        <div 
          className="absolute inset-0"
          style={{
            transform: `translate(${worldPosition.x}px, ${worldPosition.y}px)`,
            cursor: placingStructure ? 'crosshair' : 'default'
          }}
        >
          {RESOURCES.map((resource, i) => (
            <div
              key={i}
              className="absolute select-none transform hover:scale-110 transition-transform cursor-pointer active:scale-95"
              style={{ 
                left: resource.x, 
                top: resource.y,
                fontSize: '2rem'
              }}
              onClick={() => handleResourceClick(resource.value)}
            >
              {resource.emoji}
            </div>
          ))}

          {structures.map((structure) => (
            <div
              key={structure.id}
              className="absolute select-none cursor-pointer"
              style={{
                left: structure.position.x,
                top: structure.position.y,
                transform: 'translate(-50%, -50%)'
              }}
              onMouseDown={(e) => handleStructureMouseDown(structure, e)}
            >
              <div className="flex flex-col items-center">
                <div className="animate-spin text-2xl hover:scale-110 transition-transform">⛏️</div>
                {structure.health < STRUCTURE_MAX_HEALTH && (
                  <div className="w-20 h-1 bg-gray-700 rounded-full mt-1">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-200"
                      style={{ width: `${(structure.health / STRUCTURE_MAX_HEALTH) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {cursors.map((cursor) => (
            <div
              key={cursor.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: cursor.currentX,
                top: cursor.currentY,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl">{cursor.emoji}</span>
                <div className="flex items-center gap-2 mt-1 absolute top-[100%]">
                  <span className="text-xs text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap">{cursor.username}</span>
                  <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded whitespace-nowrap">💰 {cursor.points}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} />
    </>
  );
};