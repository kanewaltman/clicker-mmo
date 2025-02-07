import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../../../store/gameStore';
import { Home } from 'lucide-react';

interface WorldMapViewProps {
  onBack: () => void;
}

const WORLD_SCALE = 0.1; // Scale down the world coordinates for the minimap
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export const WorldMapView: React.FC<WorldMapViewProps> = ({ onBack }) => {
  const { resources, teleportToCastle, worldPosition, worldResources } = useGameStore();
  const teleportCost = Math.floor(resources * 0.5);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);

  // Draw the map
  useEffect(() => {
    const canvas = mapRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate map center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw resources
    worldResources.forEach(resource => {
      const x = centerX + (resource.position.x * WORLD_SCALE + pan.x) * zoom;
      const y = centerY + (resource.position.y * WORLD_SCALE + pan.y) * zoom;

      // Draw resource dot
      ctx.fillStyle = resource.rarity === 'legendary' ? '#FFD700' :
                     resource.rarity === 'rare' ? '#9370DB' :
                     resource.rarity === 'uncommon' ? '#4169E1' : '#32CD32';
      ctx.beginPath();
      ctx.arc(x, y, 2 * zoom, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw viewport rectangle
    const viewportWidth = window.innerWidth * WORLD_SCALE * zoom;
    const viewportHeight = window.innerHeight * WORLD_SCALE * zoom;
    const viewportX = centerX - (worldPosition.x * WORLD_SCALE - pan.x) * zoom - viewportWidth / 2;
    const viewportY = centerY - (worldPosition.y * WORLD_SCALE - pan.y) * zoom - viewportHeight / 2;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight);

    // Draw castle at center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(centerX + pan.x * zoom, centerY + pan.y * zoom, 4 * zoom, 0, Math.PI * 2);
    ctx.fill();
  }, [worldResources, worldPosition, zoom, pan]);

  // Handle touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch for panning
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      // Two touches for pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastPinchDistanceRef.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouchRef.current && isDragging) {
      // Handle panning
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setPan(prev => ({
        x: prev.x + deltaX / zoom,
        y: prev.y + deltaY / zoom
      }));

      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
      // Handle pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const delta = distance - lastPinchDistanceRef.current;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta * 0.01));
      setZoom(newZoom);
      
      lastPinchDistanceRef.current = distance;
    }
  };

  const handleTouchEnd = () => {
    lastTouchRef.current = null;
    lastPinchDistanceRef.current = null;
    setIsDragging(false);
  };

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !lastTouchRef.current) return;

    const deltaX = e.clientX - lastTouchRef.current.x;
    const deltaY = e.clientY - lastTouchRef.current.y;
    
    setPan(prev => ({
      x: prev.x + deltaX / zoom,
      y: prev.y + deltaY / zoom
    }));

    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    lastTouchRef.current = null;
    setIsDragging(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));
    setZoom(newZoom);
  };

  return (
    <div className="px-4 pb-16 worldmap-view-content">
      {/* Map container */}
      <div 
        ref={containerRef}
        className="bg-[#1A1A1A] rounded-[24px] w-full aspect-square mb-4 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={mapRef}
          width={400}
          height={400}
          className="w-full h-full touch-none"
        />
        
        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.5))}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white"
          >
            +
          </button>
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.5))}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white"
          >
            -
          </button>
        </div>

        {/* Map legend */}
        <div className="absolute top-4 left-4 bg-black/50 rounded-lg p-2 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-2 h-2 rounded-full bg-[#32CD32]" /> Common
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-2 h-2 rounded-full bg-[#4169E1]" /> Uncommon
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-2 h-2 rounded-full bg-[#9370DB]" /> Rare
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-2 h-2 rounded-full bg-[#FFD700]" /> Legendary
          </div>
          <div className="flex items-center gap-2 text-white/70 mt-1">
            <div className="w-2 h-2 rounded-full bg-white" /> Viewport
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 px-6 text-white font-semibold"
        >
          Back
        </button>

        <button
          onClick={() => {
            if (resources > 0) {
              teleportToCastle();
              onBack();
            }
          }}
          disabled={resources === 0}
          className={`flex-1 rounded-2xl py-4 px-6 font-semibold transition-colors flex items-center justify-center gap-2 ${
            resources > 0 
              ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30' 
              : 'bg-white/[0.03] text-white/50 cursor-not-allowed'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
          {resources > 0 && (
            <span className="text-yellow-400">💰 {teleportCost}</span>
          )}
        </button>
      </div>
    </div>
  );
};