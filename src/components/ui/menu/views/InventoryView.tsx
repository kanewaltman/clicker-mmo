import React from 'react';
import { useGameStore } from '../../../../store/gameStore';

interface InventorySlotProps {
  index: number;
}

const InventorySlot: React.FC<InventorySlotProps> = ({ index }) => (
  <button className="aspect-square bg-white/[0.03] rounded-2xl hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors">
    {/* Placeholder for item */}
  </button>
);

interface InventoryActionsProps {
  onBack: () => void;
}

const InventoryActions: React.FC<InventoryActionsProps> = ({ onBack }) => (
  <div className="flex gap-2 mt-4">
    <button 
      onClick={onBack}
      className="flex-1 bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold"
    >
      Back
    </button>
    <button className="flex-1 bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold">
      Split
    </button>
    <button className="flex-1 bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold">
      Place
    </button>
  </div>
);

interface InventoryViewProps {
  onBack: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onBack }) => {
  return (
    <div className="px-4 pb-16 inventory-view-content">
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <InventorySlot key={i} index={i} />
        ))}
      </div>
      <InventoryActions onBack={onBack} />
    </div>
  );
};