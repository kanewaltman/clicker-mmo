import React from 'react';
import { useGameStore } from '../../../../store/gameStore';
import { Home } from 'lucide-react';

interface WorldMapViewProps {
  onBack: () => void;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({ onBack }) => {
  const { resources, teleportToCastle } = useGameStore();
  const teleportCost = Math.floor(resources * 0.5);

  return (
    <div className="px-4 pb-16 worldmap-view-content">
      {/* Map container */}
      <div className="bg-[#1A1A1A] rounded-[24px] w-full aspect-square mb-4 relative">
        {/* Placeholder for future map content */}
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          World Map Coming Soon
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