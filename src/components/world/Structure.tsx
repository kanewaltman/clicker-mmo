import React from 'react';
import type { Structure as StructureType } from '../../store/gameStore';

interface StructureProps {
  structure: StructureType;
  onMouseDown: (structure: StructureType, e: React.MouseEvent) => void;
  maxHealth: number;
  isMobile?: boolean;
  isInCenter?: boolean;
}

export const Structure: React.FC<StructureProps> = ({ 
  structure, 
  onMouseDown, 
  maxHealth,
  isMobile,
  isInCenter
}) => {
  return (
    <div
      className={`absolute select-none cursor-pointer group ${
        isMobile ? 'hover:scale-110 active:scale-95' : ''
      }`}
      style={{
        left: structure.position.x,
        top: structure.position.y,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={(e) => onMouseDown(structure, e)}
    >
      <div className="flex flex-col items-center">
        <div className="animate-spin text-2xl hover:scale-110 transition-transform">⛏️</div>
        <div className="w-20 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-transform duration-200 ease-out origin-left"
            style={{ 
              transform: `scaleX(${structure.health / maxHealth})` 
            }}
          />
        </div>

        {/* Tooltip */}
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 ${
          isMobile ? (isInCenter ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover:opacity-100'
        } transition-opacity duration-200 pointer-events-none`}>
          <div className="bg-gray-800 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap">
            <div className="font-bold">Pickaxe</div>
            <div className="text-gray-300">
              HP: {structure.health}/{maxHealth}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};