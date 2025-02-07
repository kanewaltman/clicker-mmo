import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { MenuHeader } from './ui/menu/MenuHeader';
import { MainView } from './ui/menu/views/MainView';
import { InventoryView } from './ui/menu/views/InventoryView';
import { SocialView } from './ui/menu/views/SocialView';
import { LeaderboardView } from './ui/menu/views/LeaderboardView';
import { MoreView } from './ui/menu/views/MoreView';
import { PreferencesView } from './ui/menu/views/PreferencesView';
import { CursorsView } from './ui/menu/views/CursorsView';
import { WorldMapView } from './ui/menu/views/WorldMapView';
import { useMenuState } from './ui/menu/useMenuState';
import { useMenuTransition } from './ui/menu/useMenuTransition';
import type { MenuView } from './ui/menu/types';

interface DesktopMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
}

export const DesktopMenu: React.FC<DesktopMenuProps> = ({ 
  isOpen, 
  onClose,
  onOpenShop, 
  onOpenSettings 
}) => {
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
    more: 0,
    preferences: 0,
    cursors: 0,
    worldmap: 0
  });

  const [menuState, dispatch] = useMenuState();

  const handleViewTransition = useMenuTransition(
    viewsContainerRef,
    sheetRef,
    viewHeightCache,
    setIsTransitioning
  );

  const resetMenuState = useCallback(() => {
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
    
    dispatch({ type: 'RESET' });
    setIsTransitioning(false);
  }, [dispatch]);

  const handleCloseSheet = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!sheetRef.current) return;
    
    const duration = 240;
    sheetRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    sheetRef.current.style.transform = 'translate3d(120%, -50%, 0)';
    
    setTimeout(() => {
      onClose();
      resetMenuState();
    }, duration);
  }, [onClose, resetMenuState]);

  const handleNavigate = useCallback((view: MenuView) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    dispatch({ type: 'PUSH_VIEW', payload: view });
    handleViewTransition(menuState.view, view);
  }, [isTransitioning, menuState.view, handleViewTransition, dispatch]);

  const handleBack = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (isTransitioning || menuState.history.length === 0) return;
    setIsTransitioning(true);
    const previousView = menuState.history[menuState.history.length - 1];
    dispatch({ type: 'POP_VIEW' });
    handleViewTransition(menuState.view, previousView, { direction: 'left' });
  }, [isTransitioning, menuState.view, menuState.history, handleViewTransition, dispatch]);

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transform = 'translate3d(100%, -50%, 0)';
          
          requestAnimationFrame(() => {
            if (sheetRef.current) {
              sheetRef.current.style.transition = 'transform 280ms cubic-bezier(0.32, 1.75, 0.65, 0.88), height 280ms cubic-bezier(0.32, 1.75, 0.65, 0.88)';
              sheetRef.current.style.transform = 'translate3d(-6px, -50%, 0)';
              
              setTimeout(() => {
                if (sheetRef.current) {
                  sheetRef.current.style.transition = 'transform 120ms cubic-bezier(0.4, 0, 0.2, 1), height 120ms cubic-bezier(0.4, 0, 0.2, 1)';
                  sheetRef.current.style.transform = 'translate3d(0, -50%, 0)';
                }
              }, 280);
            }
          });
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleCloseSheet();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleCloseSheet]);

  useEffect(() => {
    const cacheViewHeights = () => {
      document.querySelectorAll('[class$="-view-content"]').forEach(element => {
        const viewName = element.className.match(/(\w+)-view-content/)?.[1];
        if (viewName && viewName in viewHeightCache.current) {
          // Add 36px padding (28px + 8px extra) to the height calculation
          viewHeightCache.current[viewName as MenuView] = element.getBoundingClientRect().height + 36;
        }
      });
    };

    if (isOpen) {
      cacheViewHeights();
      const resizeObserver = new ResizeObserver(cacheViewHeights);
      document.querySelectorAll('[class$="-view-content"]').forEach(element => {
        resizeObserver.observe(element);
      });

      return () => resizeObserver.disconnect();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentViewHeight = viewHeightCache.current[menuState.view] || 'auto';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[150] transition-opacity duration-300"
        onClick={handleCloseSheet}
      />

      <div
        ref={sheetRef}
        role="navigation"
        aria-label="User menu"
        className="fixed left-1/2 top-1/2 w-[400px] bg-[#1E1E1E] rounded-[32px] z-[151] overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ 
          willChange: 'transform, height',
          transform: 'translate3d(120%, -50%, 0)',
          transition: 'transform 200ms ease-out, height 200ms ease-out',
          height: currentViewHeight,
          marginLeft: '-200px' // Half of width for perfect centering
        }}
      >
        <div className="flex flex-col pt-2">
          <div className="relative">
            <MenuHeader currentView={menuState.view} onNavigate={handleNavigate} isDesktop={true} />

            <div ref={viewsContainerRef} className="relative">
              <div className={`main-view-content ${menuState.view !== 'main' ? 'hidden' : ''}`}>
                <MainView
                  onNavigate={handleNavigate}
                  onOpenSettings={onOpenSettings}
                  onTeleport={(e?: React.MouseEvent) => {
                    e?.preventDefault();
                    e?.stopPropagation();
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
              <div className={`more-view-content ${menuState.view !== 'more' ? 'hidden' : ''}`}>
                <MoreView onBack={handleBack} onNavigate={handleNavigate} />
              </div>
              <div className={`preferences-view-content ${menuState.view !== 'preferences' ? 'hidden' : ''}`}>
                <PreferencesView onBack={handleBack} />
              </div>
              <div className={`cursors-view-content ${menuState.view !== 'cursors' ? 'hidden' : ''}`}>
                <CursorsView onBack={handleBack} />
              </div>
              <div className={`worldmap-view-content ${menuState.view !== 'worldmap' ? 'hidden' : ''}`}>
                <WorldMapView onBack={handleBack} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};