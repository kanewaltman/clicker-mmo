import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../../../store/gameStore';

export const useWorldControls = (
  worldPosition: { x: number; y: number },
  mousePosition: { x: number; y: number },
  updateCursorPosition: (x: number, y: number) => void,
  resetAFKTimer: () => void,
  setIsPanning: (isPanning: boolean) => void,
  setCursorPosition: (position: { x: number; y: number }) => void,
  onCursorClick: () => void
) => {
  const setWorldPosition = useGameStore((state) => state.setWorldPosition);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isMobileRef = useRef(false);
  const touchStartTimeRef = useRef(0);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const lastUpdateTimeRef = useRef(0);
  const rafRef = useRef<number>();
  const isInitializedRef = useRef(false);

  // Throttle updates using requestAnimationFrame
  const scheduleUpdate = useCallback((fn: () => void) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 16) { // ~60fps
        lastUpdateTimeRef.current = now;
        fn();
      }
    });
  }, []);

  const getCenterPosition = useCallback(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }), []);

  const updateMobileCursor = useCallback(() => {
    if (isMobileRef.current) {
      const center = getCenterPosition();
      setCursorPosition(center);
      updateCursorPosition(center.x, center.y);
    }
  }, [getCenterPosition, setCursorPosition, updateCursorPosition]);

  // Check if an element is a UI element that should handle touch events normally
  const isUIElement = useCallback((element: HTMLElement | null): boolean => {
    if (!element) return false;
    
    // List of selectors for UI elements
    const uiSelectors = [
      'button',
      '.leaderboard',
      '.settings-modal',
      '.shop-modal',
      '[role="button"]',
      '[role="dialog"]',
      '[role="navigation"]',
      'input',
      'select',
      'a',
      '.game-ui'
    ];
    
    // Check if the element or any of its parents match UI selectors
    return uiSelectors.some(selector => 
      element.matches(selector) || element.closest(selector) !== null
    );
  }, []);

  // Initialize mobile detection and cursor position
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    isMobileRef.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobileRef.current) {
      const center = getCenterPosition();
      setCursorPosition(center);
      updateCursorPosition(center.x, center.y);
      
      // Only prevent default on non-UI elements
      document.addEventListener('touchstart', (e) => {
        if (!isUIElement(e.target as HTMLElement)) {
          e.preventDefault();
        }
      }, { passive: false });
      
      document.addEventListener('touchmove', (e) => {
        if (!isUIElement(e.target as HTMLElement)) {
          e.preventDefault();
        }
      }, { passive: false });
      
      document.addEventListener('touchend', (e) => {
        if (!isUIElement(e.target as HTMLElement)) {
          e.preventDefault();
        }
      }, { passive: false });
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [getCenterPosition, setCursorPosition, updateCursorPosition, isUIElement]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    resetAFKTimer();
    const MOVE_AMOUNT = 10;
    let newX = worldPosition.x;
    let newY = worldPosition.y;
    
    switch (e.key.toLowerCase()) {
      case 'w': newY += MOVE_AMOUNT; break;
      case 's': newY -= MOVE_AMOUNT; break;
      case 'a': newX += MOVE_AMOUNT; break;
      case 'd': newX -= MOVE_AMOUNT; break;
      default: return;
    }

    scheduleUpdate(() => {
      setWorldPosition(newX, newY);
      if (isMobileRef.current) {
        updateMobileCursor();
      } else {
        updateCursorPosition(mousePosition.x, mousePosition.y);
      }
    });
  }, [worldPosition, setWorldPosition, updateCursorPosition, mousePosition, resetAFKTimer, updateMobileCursor, scheduleUpdate]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!isMobileRef.current && (e.button === 0 || e.button === 1)) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
      setIsPanning(true);
      setCursorPosition({ x: e.clientX, y: e.clientY });
    }
  }, [setIsPanning, setCursorPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isMobileRef.current) {
      if (isDraggingRef.current) {
        scheduleUpdate(() => {
          resetAFKTimer();
          const deltaX = e.clientX - lastMousePosRef.current.x;
          const deltaY = e.clientY - lastMousePosRef.current.y;
          
          setWorldPosition(
            worldPosition.x + deltaX,
            worldPosition.y + deltaY
          );
          
          lastMousePosRef.current = { x: e.clientX, y: e.clientY };
          setCursorPosition({ x: e.clientX, y: e.clientY });
        });
      } else {
        scheduleUpdate(() => {
          setCursorPosition({ x: e.clientX, y: e.clientY });
          updateCursorPosition(e.clientX, e.clientY);
        });
      }
    }
  }, [worldPosition, setWorldPosition, setCursorPosition, updateCursorPosition, resetAFKTimer, scheduleUpdate]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isMobileRef.current && isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      setIsPanning(false);
      scheduleUpdate(() => {
        setCursorPosition({ x: e.clientX, y: e.clientY });
        updateCursorPosition(e.clientX, e.clientY);
      });
    }
  }, [setIsPanning, setCursorPosition, updateCursorPosition, scheduleUpdate]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Allow normal touch behavior for UI elements
    if (isUIElement(e.target as HTMLElement)) {
      return;
    }
    
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartTimeRef.current = Date.now();
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      setIsPanning(true);
      // Keep cursor in center on mobile
      updateMobileCursor();
    }
  }, [setIsPanning, updateMobileCursor, isUIElement]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Allow normal touch behavior for UI elements
    if (isUIElement(e.target as HTMLElement)) {
      return;
    }
    
    e.preventDefault();
    if (isDraggingRef.current && e.touches.length === 1) {
      scheduleUpdate(() => {
        resetAFKTimer();
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastMousePosRef.current.x;
        const deltaY = touch.clientY - lastMousePosRef.current.y;
        
        setWorldPosition(
          worldPosition.x + deltaX,
          worldPosition.y + deltaY
        );
        
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
        // Keep cursor in center on mobile
        updateMobileCursor();
      });
    }
  }, [worldPosition, setWorldPosition, resetAFKTimer, updateMobileCursor, scheduleUpdate, isUIElement]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Allow normal touch behavior for UI elements
    if (isUIElement(e.target as HTMLElement)) {
      return;
    }
    
    e.preventDefault();
    if (isDraggingRef.current) {
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTimeRef.current;
      
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
        
        // If touch was short and didn't move much, treat as tap
        if (touchDuration < 200 && deltaX < 10 && deltaY < 10) {
          onCursorClick();
        }
      }

      isDraggingRef.current = false;
      setIsPanning(false);
      // Keep cursor in center on mobile
      updateMobileCursor();
    }
  }, [setIsPanning, onCursorClick, updateMobileCursor, isUIElement]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleKeyPress, handleMouseDown, handleMouseMove, handleMouseUp, 
      handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Prevent zooming and unwanted mobile behaviors
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        return false;
      }
    };

    const handleGesture = (e: any) => {
      if (!isUIElement(e.target as HTMLElement)) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('gesturestart', handleGesture);
    document.addEventListener('gesturechange', handleGesture);
    document.addEventListener('gestureend', handleGesture);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      document.removeEventListener('gestureend', handleGesture);
    };
  }, [isUIElement]);
};