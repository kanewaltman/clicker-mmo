import React, { useState, useEffect } from 'react';
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
  const [isHarvesting, setIsHarvesting] = useState(false);

  // Reset harvesting animation after a short delay
  useEffect(() => {
    if (isHarvesting) {
      const timer = setTimeout(() => {
        setIsHarvesting(false);
      }, 200); // Duration matches the CSS transition
      return () => clearTimeout(timer);
    }
  }, [isHarvesting]);

  // Watch for changes in resource health to trigger harvesting animation
  useEffect(() => {
    setIsHarvesting(true);
  }, [resource.currentHealth]);

  const handleClick = (e: React.MouseEvent) => {
    // For desktop, trigger on direct click
    // For mobile, only trigger if the resource is in the center
    if (!isMobile || (isMobile && isInCenter)) {
      onResourceClick(resource);
    }
  };

  return (
    <div
      className={`
        absolute select-none transform cursor-pointer
        ${RARITY_SCALES[resource.rarity]}
        group
      `}
      style={{ 
        left: resource.position.x, 
        top: resource.position.y,
        fontSize: '2rem',
        transform: `scale(${
          isHarvesting ? 0.95 : 
          (!isMobile && !isHarvesting) ? 1 : 
          (isMobile && isInCenter) ? 1.1 : 
          1
        })`,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={handleClick}
    >
      <div 
        className={`
          relative transform transition-transform duration-200
          ${!isMobile ? 'hover:scale-110' : ''}
        `}
      >
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