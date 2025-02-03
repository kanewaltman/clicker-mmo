import React from 'react';
import type { WorldResource } from '../../store/gameStore';
import { RARITY_COLORS, RARITY_SCALES } from './constants';

interface ResourceNodeProps {
  resource: WorldResource;
  onResourceClick: (resource: WorldResource) => void;
  isMobile?: boolean;
  isInCenter?: boolean;
}

export const ResourceNode: React.FC<ResourceNodeProps> = ({ 
  resource, 
  onResourceClick,
  isMobile,
  isInCenter
}) => {
  return (
    <div
      className={`absolute select-none transform hover:scale-110 transition-transform cursor-pointer active:scale-95 ${RARITY_SCALES[resource.rarity]} group`}
      style={{ 
        left: resource.position.x, 
        top: resource.position.y,
        fontSize: '2rem'
      }}
      onClick={() => onResourceClick(resource)}
    >
      <div className="relative">
        <div className={RARITY_COLORS[resource.rarity]}>
          {resource.emoji}
        </div>
        
        {/* Resource info tooltip */}
        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 ${
          isMobile ? (isInCenter ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover:opacity-100'
        } transition-opacity duration-200 pointer-events-none`}>
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