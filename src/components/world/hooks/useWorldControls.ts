import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../../../store/gameStore';

export const useWorldControls = (
  worldPosition: { x: number; y: number },
  mousePosition: { x: number; y: number },
  updateCursorPosition: (x: number, y: number) => void,
  resetAFKTimer: () => void,
  setIsPanning: (isPanning: boolean) => void,
  setCursorPosition: (position: { x: number; y: number }) => void
) => {
  const setWorldPosition = useGameStore((state) => state.setWorldPosition);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const isMobileRef = useRef(false);

  // Check if device is mobile
  useEffect(() => {
    isMobileRef.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    resetAFKTimer();
    const MOVE_AMOUNT = 10;
    let newX = worldPosition.x;
    let newY = worldPosition.y;
    
    switch (e.key.toLowerCase()) {
      case 'w':
        newY += MOVE_AMOUNT;
        break;
      case 's':
        newY -= MOVE_AMOUNT;
        break;
      case 'a':
        newX += MOVE_AMOUNT;
        break;
      case 'd':
        newX -= MOVE_AMOUNT;
        break;
    }

    setWorldPosition(newX, newY);
    updateCursorPosition(mousePosition.x, mousePosition.y);
  }, [worldPosition, setWorldPosition, updateCursorPosition, mousePosition, resetAFKTimer]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Left click (button 0) or middle click (button 1)
    if (e.button === 0 || e.button === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
      setIsPanning(true);
      setCursorPosition({ x: e.clientX, y: e.clientY });
    }
  }, [setIsPanning, setCursorPosition]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;
      
      setWorldPosition(
        worldPosition.x + deltaX,
        worldPosition.y + deltaY
      );
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setCursorPosition({ x: e.clientX, y: e.clientY });
    }
  }, [worldPosition, setWorldPosition, setCursorPosition]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      setIsPanning(false);
      setCursorPosition({ x: e.clientX, y: e.clientY });
      updateCursorPosition(e.clientX, e.clientY);
    }
  }, [setIsPanning, setCursorPosition, updateCursorPosition]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      };
      setIsPanning(true);
      setCursorPosition({ 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      });
    }
  }, [setIsPanning, setCursorPosition]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDraggingRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastMousePosRef.current.x;
      const deltaY = touch.clientY - lastMousePosRef.current.y;
      
      setWorldPosition(
        worldPosition.x + deltaX,
        worldPosition.y + deltaY
      );
      
      lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      
      // For mobile, keep cursor in center of screen
      if (isMobileRef.current) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        setCursorPosition({ x: centerX, y: centerY });
      } else {
        setCursorPosition({ x: touch.clientX, y: touch.clientY });
      }
    }
  }, [worldPosition, setWorldPosition, setCursorPosition]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsPanning(false);
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        setCursorPosition({ x: touch.clientX, y: touch.clientY });
        updateCursorPosition(touch.clientX, touch.clientY);
      }
    }
  }, [setIsPanning, setCursorPosition, updateCursorPosition]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
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

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleGesture = (e: any) => {
      e.preventDefault();
    };

    // Prevent pinch zoom
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('gesturestart', handleGesture);
    document.addEventListener('gesturechange', handleGesture);
    document.addEventListener('gestureend', handleGesture);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
      document.removeEventListener('gestureend', handleGesture);
    };
  }, []);
};