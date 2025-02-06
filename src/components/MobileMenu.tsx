import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  LayoutGridIcon as GridFill,
  UsersIcon as UsersFill,
  GlobeIcon as GlobeFill,
  TrophyIcon as TrophyFill,
  SettingsIcon as SettingsFill,
  MessageSquareIcon as MessageSquareFill
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface MobileMenuProps {
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

type MenuView = 'main' | 'inventory';

interface MenuItemProps {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  variant?: 'dense' | 'large';
}

const MenuItem: React.FC<MenuItemProps> = ({ 
  label, 
  icon, 
  onClick, 
  isFirst, 
  isLast,
  variant = 'dense'
}) => (
  <button
    onClick={onClick}
    className={`
      flex justify-between items-center w-full
      bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06]
      transition-all duration-200 ease-in-out
      group
      ${isFirst ? 'rounded-t-[16px]' : ''}
      ${isLast ? 'rounded-b-[16px]' : ''}
      ${variant === 'dense' ? 'p-4' : 'py-5 px-4'}
      ${!isLast ? 'mb-[2px]' : ''}
    `}
  >
    <div className={`
      font-semibold tracking-normal text-white 
      transition-transform duration-200 ease-in-out
      group-hover:translate-x-2
      ${variant === 'dense' ? 'text-sm' : 'text-base'}
    `}>
      {label}
    </div>
    <div className="text-white/70 [&>svg]:fill-white/[0.06]">
      {icon}
    </div>
  </button>
);

const UserProfile: React.FC = () => {
  const { username, resources, cursorEmoji } = useGameStore();
  
  return (
    <div className="flex gap-2 items-center self-stretch font-semibold whitespace-nowrap">
      <div className="text-2xl">{cursorEmoji}</div>
      <div className="flex flex-col justify-center py-1">
        <div className="text-lg tracking-normal text-white">{username}</div>
        <div className="text-xs tracking-normal text-amber-300">💰 {resources}</div>
      </div>
    </div>
  );
};

const Header: React.FC<{ currentView: MenuView }> = ({ currentView }) => {
  return (
    <div className="flex justify-between items-center px-6 pb-4">
      <UserProfile />
      {currentView === 'main' && (
        <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
          <span className="text-white/50 font-semibold">Chat</span>
          <div className="text-white/50 [&>svg]:fill-white/[0.06]">
            <MessageSquareFill className="w-5 h-5" />
          </div>
        </button>
      )}
    </div>
  );
};

const InventorySlot: React.FC<{ index: number }> = ({ index }) => (
  <button className="aspect-square bg-white/[0.03] rounded-2xl hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors">
    {/* Placeholder for item */}
  </button>
);

const InventoryGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <InventorySlot key={i} index={i} />
      ))}
    </div>
  );
};

const InventoryActions: React.FC<{ onBack: () => void }> = ({ onBack }) => (
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

export const MobileMenu: React.FC<MobileMenuProps> = ({ onOpenShop, onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MenuView>('main');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { teleportToCastle, resources } = useGameStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const viewsContainerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const initialTouchY = useRef(0);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const animationFrameRef = useRef<number>();
  const viewHeightCache = useRef<Record<MenuView, number>>({
    main: 0,
    inventory: 0
  });

  useEffect(() => {
    const cacheViewHeights = () => {
      const mainView = document.querySelector('.main-view-content');
      const inventoryView = document.querySelector('.inventory-view-content');

      if (mainView) {
        viewHeightCache.current.main = mainView.getBoundingClientRect().height + 56;
      }
      if (inventoryView) {
        viewHeightCache.current.inventory = inventoryView.getBoundingClientRect().height + 56;
      }
    };

    cacheViewHeights();

    const resizeObserver = new ResizeObserver(cacheViewHeights);
    const views = document.querySelectorAll('.main-view-content, .inventory-view-content');
    views.forEach(view => resizeObserver.observe(view));

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translateY(100%)';
          
          requestAnimationFrame(() => {
            if (sheetRef.current) {
              // Faster initial spring with more aggressive overshoot
              sheetRef.current.style.transition = 'transform 280ms cubic-bezier(0.32, 1.75, 0.65, 0.88)';
              // Smaller overshoot distance
              sheetRef.current.style.transform = 'translateY(-6px)';
              
              setTimeout(() => {
                if (sheetRef.current) {
                  // Quicker settle time
                  sheetRef.current.style.transition = 'transform 120ms cubic-bezier(0.4, 0, 0.2, 1)';
                  sheetRef.current.style.transform = 'translateY(0)';
                }
              }, 280); // Match the initial spring duration
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

  const handleViewTransition = useCallback((view: MenuView) => {
    if (isTransitioning || !viewsContainerRef.current || !sheetRef.current) return;
    setIsTransitioning(true);

    const direction = view === 'main' ? -1 : 1;
    const container = viewsContainerRef.current;
    
    if (sheetRef.current) {
      const currentHeight = sheetRef.current.offsetHeight;
      const targetHeight = viewHeightCache.current[view];
      
      sheetRef.current.style.height = `${currentHeight}px`;
      sheetRef.current.style.transition = 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)';
      
      void sheetRef.current.offsetHeight;
      
      sheetRef.current.style.height = `${targetHeight}px`;
    }
    
    container.style.transform = 'translateX(0)';
    container.style.transition = 'none';
    
    void container.offsetHeight;

    container.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = `translateX(${-direction * 100}%)`;

    setTimeout(() => {
      setCurrentView(view);
      container.style.transition = 'none';
      container.style.transform = 'translateX(0)';
      setIsTransitioning(false);
    }, 300);
  }, [isTransitioning]);

  const handleCloseSheet = useCallback(() => {
    if (!sheetRef.current) return;
    
    const duration = 240; // Faster overall duration
    const currentHeight = sheetRef.current.offsetHeight;
    
    sheetRef.current.style.height = `${currentHeight}px`;
    // Standard material easing for smooth exit
    sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    void sheetRef.current.offsetHeight;
    
    sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
    sheetRef.current.style.height = '0px';
    
    const cleanup = () => {
      if (sheetRef.current) {
        sheetRef.current.removeEventListener('transitionend', cleanup);
        setIsOpen(false);
        setCurrentView('main');
        sheetRef.current.style.transform = 'translate3d(0, 120%, 0)';
        sheetRef.current.style.height = `${viewHeightCache.current.main}px`;
      }
    };
    
    sheetRef.current.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, duration + 100);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    isDragging.current = false;
    
    const touchDuration = e.timeStamp - lastTouchTime.current;
    const touchDistance = e.changedTouches[0].clientY - lastTouchY.current;
    const velocity = touchDistance / touchDuration;
    
    const threshold = window.innerHeight * 0.05;
    
    if (dragCurrentY.current > threshold || velocity > 0.2) {
      const duration = Math.min(Math.abs(velocity) * 500, 300);
      const currentHeight = sheetRef.current.offsetHeight;
      
      sheetRef.current.style.height = `${currentHeight}px`;
      sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.33, 1, 0.68, 1), height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      
      void sheetRef.current.offsetHeight;
      
      sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
      sheetRef.current.style.height = '0px';
      
      const cleanup = () => {
        if (sheetRef.current) {
          sheetRef.current.removeEventListener('transitionend', cleanup);
          setIsOpen(false);
          setCurrentView('main');
          sheetRef.current.style.transform = 'translate3d(0, 120%, 0)';
          sheetRef.current.style.height = `${viewHeightCache.current.main}px`;
        }
      };
      
      sheetRef.current.addEventListener('transitionend', cleanup, { once: true });
      setTimeout(cleanup, duration + 100);
    } else {
      sheetRef.current.style.transition = 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)';
      sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    
    dragCurrentY.current = 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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

    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    
    if (deltaY < 0) {
      const absUpwardDelta = Math.abs(deltaY);
      const resistance = 3 + (absUpwardDelta / 50);
      const easedDelta = deltaY / resistance;
      dragCurrentY.current = easedDelta;
    } else {
      dragCurrentY.current = deltaY;
    }

    lastTouchY.current = touch.clientY;
    lastTouchTime.current = e.timeStamp;
    
    sheetRef.current.style.transform = `translate3d(0, ${dragCurrentY.current}px, 0)`;
  }, []);

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const menuVariant: 'dense' | 'large' = 'large';

  return (
    <>
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

      <div
        className={`fixed inset-0 bg-black/50 z-[150] transition-opacity duration-300 md:hidden game-ui ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleCloseSheet}
      />

      <div
        ref={sheetRef}
        role="navigation"
        aria-label="User menu"
        className={`
          fixed inset-x-2 bottom-2 
          bg-[#1E1E1E] rounded-[32px] 
          z-[151] md:hidden game-ui
          overflow-hidden
          ${!isOpen && 'pointer-events-none'}
        `}
        onClick={e => e.stopPropagation()}
        style={{ 
          willChange: 'transform',
          touchAction: 'none',
          transform: 'translate3d(0, 120%, 0)',
          transition: 'transform 200ms ease-out',
          height: viewHeightCache.current[currentView] || 'auto'
        }}
      >
        <div 
          className="flex flex-col pt-2 drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex self-center bg-zinc-300/10 h-[5px] rounded-[34px] w-[55px] mb-4" />
          
          <div className="relative">
            <Header currentView={currentView} />

            <div ref={viewsContainerRef} className="relative">
              {currentView === 'main' ? (
                <div className="px-4 pb-16 main-view-content">
                  <div className="flex flex-col w-full">
                    <MenuItem 
                      label="Inventory" 
                      icon={<GridFill size={20} />} 
                      onClick={() => handleViewTransition('inventory')}
                      isFirst
                      variant={menuVariant}
                    />
                    <MenuItem 
                      label="Social" 
                      icon={<UsersFill size={20} />}
                      variant={menuVariant}
                    />
                    <MenuItem 
                      label="World Map" 
                      icon={<GlobeFill size={20} />}
                      onClick={resources > 0 ? handleTeleport : undefined}
                      variant={menuVariant}
                    />
                    <MenuItem 
                      label="Leaderboard" 
                      icon={<TrophyFill size={20} />}
                      variant={menuVariant}
                    />
                    <MenuItem 
                      label="Preferences" 
                      icon={<SettingsFill size={20} />}
                      onClick={onOpenSettings}
                      isLast
                      variant={menuVariant}
                    />
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-16 inventory-view-content">
                  <InventoryGrid />
                  <div className="mt-4">
                    <InventoryActions onBack={() => handleViewTransition('main')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;