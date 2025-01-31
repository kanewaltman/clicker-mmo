import React from 'react';
import { useGameStore } from '../store/gameStore';
import { X } from 'lucide-react';

interface ShopProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Shop: React.FC<ShopProps> = ({ isOpen, onClose }) => {
  const { resources, buyPickaxe, inventory } = useGameStore();
  const PICKAXE_COST = 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Shop</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
            <div>
              <h3 className="text-white font-semibold">Pickaxe</h3>
              <p className="text-gray-400 text-sm">Automatically gathers resources</p>
              <p className="text-yellow-400 mt-1">💰 {PICKAXE_COST}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={buyPickaxe}
                disabled={resources < PICKAXE_COST}
                className={`px-4 py-2 rounded ${
                  resources >= PICKAXE_COST
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 cursor-not-allowed'
                } text-white transition-colors`}
              >
                Buy
              </button>
              <span className="text-gray-400 text-sm">
                Owned: {inventory.pickaxes}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};