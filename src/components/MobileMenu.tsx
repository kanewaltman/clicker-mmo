import React from 'react';
import { Menu, X, Settings, Home, Trophy, Store } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface MobileMenuProps {
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ onOpenShop, onOpenSettings }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { teleportToCastle, resources } = useGameStore();

  const handleTeleport = () => {
    if (resources > 0) {
      teleportToCastle();
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors md:hidden"
      >
        <Menu className="text-white" size={24} />
      </button>

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <div
          className={`fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-6 transition-transform duration-300 transform ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-600 rounded-full" />
          
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>

          {/* Menu Items */}
          <div className="mt-6 space-y-4">
            <button
              onClick={() => {
                onOpenShop();
                setIsOpen(false);
              }}
              className="w-full p-4 bg-gray-700 rounded-lg flex items-center gap-3 hover:bg-gray-600 transition-colors"
            >
              <Store className="text-white" size={24} />
              <span className="text-white font-medium">Shop</span>
            </button>

            <button
              onClick={handleTeleport}
              className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                resources > 0 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-gray-700 opacity-50 cursor-not-allowed'
              }`}
              disabled={resources === 0}
            >
              <Home className="text-white" size={24} />
              <span className="text-white font-medium">Return to Town</span>
              {resources > 0 && (
                <span className="ml-auto text-yellow-400">
                  💰 {Math.floor(resources * 0.5)}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className="w-full p-4 bg-gray-700 rounded-lg flex items-center gap-3 hover:bg-gray-600 transition-colors"
            >
              <Settings className="text-white" size={24} />
              <span className="text-white font-medium">Settings</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full p-4 bg-gray-700 rounded-lg flex items-center gap-3 hover:bg-gray-600 transition-colors"
            >
              <Trophy className="text-white" size={24} />
              <span className="text-white font-medium">Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};