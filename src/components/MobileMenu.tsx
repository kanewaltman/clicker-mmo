import React, { useRef, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface MobileMenuProps {
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

interface MenuItemProps {
  label: string;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="flex gap-10 justify-between items-center p-4 w-full rounded-2xl bg-white/0 hover:bg-white/5 transition-colors"
  >
    <div className="text-sm font-semibold tracking-normal text-white">{label}</div>
    <MessageSquare className="w-5 h-5 text-white/70" />
  </button>
);

const UserProfile: React.FC = () => {
  const { username, resources } = useGameStore();
  
  return (
    <div className="flex gap-2 items-center self-stretch font-semibold whitespace-nowrap">
      <div className="w-[25px] h-[25px] rounded-full bg-white/10" />
      <div className="flex flex-col justify-center py-1 px-3">
        <div className="text-lg tracking-normal text-white">{username}</div>
        <div className="text-xs tracking-normal text-amber-300">💰 {resources}</div>
      </div>
    </div>
  );
};

export const MobileMenu: React.FC<MobileMenuProps> = ({ onOpenShop, onOpenSettings }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { teleportToCastle, resources } = useGameStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);

  const handleTeleport = () => {
    if (resources > 0) {
      teleportToCastle();
      setIsOpen(false);
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    dragCurrentY.current = 0;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    dragCurrentY.current = Math.max(0, deltaY);
    
    sheetRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current || !sheetRef.current) return;
    
    isDragging.current = false;
    const threshold = window.innerHeight * 0.2; // 20% of screen height
    
    if (dragCurrentY.current > threshold) {
      setIsOpen(false);
    } else {
      sheetRef.current.style.transform = 'translateY(0)';
    }
    
    dragCurrentY.current = 0;
  }, []);

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleOpenMenu}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpenMenu(e);
        }}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-stone-900 rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors md:hidden game-ui"
      >
        <div className="w-6 h-6 bg-white/10 rounded-full" />
      </button>

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden game-ui ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      >
        <nav
          ref={sheetRef}
          role="navigation"
          aria-label="User menu"
          className={`fixed m-2 inset-x-2 bottom-2 bg-stone-900 rounded-[32px] transition-transform duration-300 transform ${
            isOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          onClick={e => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            willChange: 'transform',
            touchAction: 'none'
          }}
        >
          {/* Handle */}
          <div className="flex flex-col px-4 pt-2 pb-4">
            <div className="flex self-center bg-zinc-300/10 h-[5px] rounded-[34px] w-[55px] mb-4" />
            
            {/* User Profile */}
            <div className="flex justify-between items-center p-2 w-full">
              <UserProfile />
              <button
                onClick={onOpenSettings}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <div className="w-5 h-5 bg-white/10 rounded-full" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="mt-4 flex flex-col w-full">
              <MenuItem label="Inventory" onClick={onOpenShop} />
              <MenuItem label="Social" />
              <MenuItem 
                label="Return to Town" 
                onClick={resources > 0 ? handleTeleport : undefined} 
              />
              <MenuItem label="Leaderboard" />
              <MenuItem label="Preferences" onClick={onOpenSettings} />
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};