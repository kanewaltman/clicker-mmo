import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { MenuHeader } from './ui/menu/MenuHeader';
import { MainView } from './ui/menu/views/MainView';
import { InventoryView } from './ui/menu/views/InventoryView';
import { SocialView } from './ui/menu/views/SocialView';
import { LeaderboardView } from './ui/menu/views/LeaderboardView';
import { useMenuState } from './ui/menu/useMenuState';
import { useMenuTransition } from './ui/menu/useMenuTransition';
import { useTouchHandling } from './ui/menu/useTouchHandling';
import type { MenuView } from './ui/menu/types';

interface MobileMenuProps {
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ onOpenShop, onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { teleportToCastle, resources } = useGameStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const viewsContainerRef = useRef<HTMLDivElement>(null);
  const viewHeightCache = useRef<Record<MenuView, number>>({
    main: 0,
    inventory: 0,
    social: 0,
    map: 0,
    leaderboard: 0,
    settings: 0
  });

  const [menuState, dispatch] = useMenuState();

  const handleViewTransition = useMenuTransition(
    viewsContainerRef,
    sheetRef,
    viewHeightCache,
    setIsTransitioning
  );

  const resetMenuState = useCallback(() => {
    // Reset all view styles first
    if (viewsContainerRef.current) {
      const views = Array.from(viewsContainerRef.current.children) as HTMLElement[];
      views.forEach(view => {
        view.style.display = view.classList.contains('main-view-content') ? 'block' : 'none';
        view.style.position = '';
        view.style.top = '';
        view.style.left = '';
        view.style.width = '';
        view.style.transform = '';
        view.style.opacity = '';
        view.style.transition = '';
      });
    }
    
    // Reset menu state
    dispatch({ type: 'RESET' });
    setIsTransitioning(false);
  }, [dispatch]);

  const handleCloseSheet = useCallback(() => {
    if (!sheetRef.current) return;
    
    const duration = 240;
    sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    sheetRef.current.style.transform = 'translate3d(0, 120%, 0)';
    
    setTimeout(() => {
      setIsOpen(false);
      resetMenuState();
    }, duration);
  }, [resetMenuState]);

  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchHandling({
    onClose: handleCloseSheet,
    setIsOpen
  });

  useEffect(() => {
    const cacheViewHeights = () => {
      document.querySelectorAll('[class$="-view-content"]').forEach(element => {
        const viewName = element.className.match(/(\w+)-view-content/)?.[1];
        if (viewName && viewName in viewHeightCache.current) {
          viewHeightCache.current[viewName as MenuView] = element.getBoundingClientRect().height + 56;
        }
      });
    };

    cacheViewHeights();
    const resizeObserver = new ResizeObserver(cacheViewHeights);
    document.querySelectorAll('[class$="-view-content"]').forEach(element => {
      resizeObserver.observe(element);
    });

    return () => resizeObserver.disconnect();
  }, []);

  const handleNavigate = useCallback((view: MenuView) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    dispatch({ type: 'PUSH_VIEW', payload: view });
    handleViewTransition(menuState.view, view);
  }, [isTransitioning, menuState.view, handleViewTransition, dispatch]);

  const handleBack = useCallback(() => {
    if (isTransitioning || menuState.history.length === 0) return;
    setIsTransitioning(true);
    const previousView = menuState.history[menuState.history.length - 1];
    dispatch({ type: 'POP_VIEW' });
    handleViewTransition(menuState.view, previousView, { direction: 'left' });
  }, [isTransitioning, menuState.view, menuState.history, handleViewTransition, dispatch]);

  const handleOpenMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resetMenuState();
    setIsOpen(true);
  }, [resetMenuState]);

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translateY(100%)';
          
          requestAnimationFrame(() => {
            if (sheetRef.current) {
              sheetRef.current.style.transition = 'transform 280ms cubic-bezier(0.32, 1.75, 0.65, 0.88)';
              sheetRef.current.style.transform = 'translateY(-6px)';
              
              setTimeout(() => {
                if (sheetRef.current) {
                  sheetRef.current.style.transition = 'transform 120ms cubic-bezier(0.4, 0, 0.2, 1)';
                  sheetRef.current.style.transform = 'translateY(0)';
                }
              }, 280);
            }
          });
        }
      });
    }
  }, [isOpen]);

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
          height: viewHeightCache.current[menuState.view] || 'auto'
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
            <MenuHeader currentView={menuState.view} />

            <div ref={viewsContainerRef} className="relative">
              <div className={`main-view-content ${menuState.view !== 'main' ? 'hidden' : ''}`}>
                <MainView
                  onNavigate={handleNavigate}
                  onOpenSettings={onOpenSettings}
                  onTeleport={() => {
                    if (resources > 0) {
                      teleportToCastle();
                      handleCloseSheet();
                    }
                  }}
                  canTeleport={resources > 0}
                />
              </div>
              <div className={`inventory-view-content ${menuState.view !== 'inventory' ? 'hidden' : ''}`}>
                <InventoryView onBack={handleBack} />
              </div>
              <div className={`social-view-content ${menuState.view !== 'social' ? 'hidden' : ''}`}>
                <SocialView onBack={handleBack} />
              </div>
              <div className={`leaderboard-view-content ${menuState.view !== 'leaderboard' ? 'hidden' : ''}`}>
                <LeaderboardView onBack={handleBack} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;