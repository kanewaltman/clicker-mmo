import React from 'react';
import type { Structure as StructureType } from '../../store/gameStore';

interface StructureProps {
  structure: StructureType;
  onMouseDown: (structure: StructureType, e: React.MouseEvent) => void;
  maxHealth: number;
}

export const Structure: React.FC<StructureProps> = ({ structure, onMouseDown, maxHealth }) => {
  return (
    <div
      className="absolute select-none cursor-pointer"
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
      </div>
    </div>
  );
};