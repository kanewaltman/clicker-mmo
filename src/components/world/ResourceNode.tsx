import React from 'react';
import type { WorldResource } from '../../store/gameStore';
import { RARITY_COLORS, RARITY_SCALES } from './constants';

interface ResourceNodeProps {
  resource: WorldResource;
  onResourceClick: (resource: WorldResource) => void;
}

export const ResourceNode: React.FC<ResourceNodeProps> = ({ resource, onResourceClick }) => {
  return (
    <div
      className={`absolute select-none transform hover:scale-110 transition-transform cursor-pointer active:scale-95 ${RARITY_SCALES[resource.rarity]}`}
      style={{ 
        left: resource.position.x, 
        top: resource.position.y,
        fontSize: '2rem'
      }}
      onClick={() => onResourceClick(resource)}
    >
      <div className="relative group">
        <div className={RARITY_COLORS[resource.rarity]}>
          {resource.emoji}
        </div>
        
        {/* Resource info tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
          <div className="bg-gray-800 text-white px-3 py-2 rounded shadow-lg text-sm whitespace-nowrap">
            <div className={`font-bold ${RARITY_COLORS[resource.rarity]} capitalize`}>
              {resource.rarity} {resource.type}
            </div>
            <div className="text-gray-300">
              HP: {resource.currentHealth}/{resource.maxHealth}
            </div>
            <div className="text-yellow-400">
              +{resource.valuePerClick} 💰 per click
            </div>
          </div>
        </div>

        {/* Health bar */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 bg-green-500 rounded-full transition-transform duration-200 ease-out origin-left"
            style={{ 
              transform: `scaleX(${resource.currentHealth / resource.maxHealth})` 
            }}
          />
        </div>
      </div>
    </div>
  );
};