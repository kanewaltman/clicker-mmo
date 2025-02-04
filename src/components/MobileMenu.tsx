import React, { useRef, useCallback, useEffect } from 'react';
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
  const initialTouchY = useRef(0);

  // Reset transform when sheet opens with bounce effect
  useEffect(() => {
    if (sheetRef.current && isOpen) {
      // Initial overshoot
      sheetRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0, 0.67, 0)';
      sheetRef.current.style.transform = 'translateY(-12px)';
      
      // Bounce back
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 150ms cubic-bezier(0.33, 1, 0.68, 1)';
          sheetRef.current.style.transform = 'translateY(0)';
        }
      }, 300);
    }
  }, [isOpen]);

  const handleTeleport = () => {
    if (resources > 0) {
      teleportToCastle();
      setIsOpen(false);
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle drag from the handle area
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.stopPropagation();
    const touch = e.touches[0];
    dragStartY.current = touch.clientY;
    initialTouchY.current = touch.clientY;
    dragCurrentY.current = 0;
    isDragging.current = true;

    // Remove transition during drag
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    
    // Apply progressive resistance to upward movement
    if (deltaY < 0) {
      // Start with strong initial resistance that increases more gradually
      const absUpwardDelta = Math.abs(deltaY);
      // Base resistance starts at 3 and increases more slowly
      const resistance = 3 + (absUpwardDelta / 50);
      // Apply a smooth easing function
      const easedDelta = deltaY / resistance;
      dragCurrentY.current = easedDelta;
    } else {
      dragCurrentY.current = deltaY;
    }
    
    requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
      }
    });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    isDragging.current = false;
    
    // Restore transition
    sheetRef.current.style.transition = 'transform 200ms ease-out';
    
    // Reduced threshold to 5% of screen height
    const threshold = window.innerHeight * 0.05;
    const velocity = Math.abs(e.changedTouches[0].clientY - initialTouchY.current) / e.timeStamp;
    
    if (dragCurrentY.current > threshold || velocity > 0.5) {
      // Animate to final position before closing
      const finalY = window.innerHeight + 100; // Add extra 100px to ensure full dismissal
      sheetRef.current.style.transform = `translateY(${finalY}px)`;
      
      // Wait for animation to complete before closing
      setTimeout(() => {
        setIsOpen(false);
        // Reset transform after closing
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translateY(120%)'; // Increase to 120% to ensure no visibility
        }
      }, 200);
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
        className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-stone-900 rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors md:hidden game-ui"
      >
        <div className="w-6 h-6 bg-white/10 rounded-full" />
      </button>

      {/* Background Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[150] transition-opacity duration-300 md:hidden game-ui ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        role="navigation"
        aria-label="User menu"
        className={`fixed inset-x-2 bottom-2 bg-stone-900 rounded-[32px] z-[151] md:hidden game-ui ${
          !isOpen && 'pointer-events-none'
        }`}
        onClick={e => e.stopPropagation()}
        style={{ 
          willChange: 'transform',
          touchAction: 'none',
          transform: 'translateY(120%)', // Start at 120% to ensure no visibility
          transition: 'transform 200ms ease-out'
        }}
      >
        {/* Handle */}
        <div 
          className="flex flex-col px-4 pt-2 pb-4 drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
      </div>
    </>
  );
};