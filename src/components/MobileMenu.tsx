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
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const animationFrameRef = useRef<number>();

  // Reset transform when sheet opens with bounce effect
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translateY(100%)';
          
          // Initial overshoot
          requestAnimationFrame(() => {
            if (sheetRef.current) {
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
          });
        }
      });
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
    lastTouchY.current = touch.clientY;
    lastTouchTime.current = e.timeStamp;
    dragCurrentY.current = 0;
    isDragging.current = true;

    // Remove transition during drag
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }

    // Cancel any ongoing animations
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    
    // Apply progressive resistance to upward movement
    if (deltaY < 0) {
      const absUpwardDelta = Math.abs(deltaY);
      const resistance = 3 + (absUpwardDelta / 50);
      const easedDelta = deltaY / resistance;
      dragCurrentY.current = easedDelta;
    } else {
      dragCurrentY.current = deltaY;
    }

    // Update last touch position and time for velocity calculation
    lastTouchY.current = touch.clientY;
    lastTouchTime.current = e.timeStamp;
    
    // Use transform3d for better performance
    sheetRef.current.style.transform = `translate3d(0, ${dragCurrentY.current}px, 0)`;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    isDragging.current = false;
    
    // Calculate velocity (pixels per millisecond)
    const touchDuration = e.timeStamp - lastTouchTime.current;
    const touchDistance = e.changedTouches[0].clientY - lastTouchY.current;
    const velocity = touchDistance / touchDuration;
    
    // Reduced threshold to 5% of screen height
    const threshold = window.innerHeight * 0.05;
    
    if (dragCurrentY.current > threshold || velocity > 0.2) {
      // Immediately start closing animation
      const duration = Math.min(Math.abs(velocity) * 500, 300);
      sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
      sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
      
      // Ensure we clean up properly
      const cleanup = () => {
        if (sheetRef.current) {
          sheetRef.current.removeEventListener('transitionend', cleanup);
          setIsOpen(false);
          sheetRef.current.style.transform = 'translate3d(0, 120%, 0)';
        }
      };
      
      sheetRef.current.addEventListener('transitionend', cleanup, { once: true });
      
      // Fallback cleanup in case transitionend doesn't fire
      setTimeout(cleanup, duration + 100);
    } else {
      // Snap back to open position
      sheetRef.current.style.transition = 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)';
      sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    
    dragCurrentY.current = 0;
  }, []);

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
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
          transform: 'translate3d(0, 120%, 0)',
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