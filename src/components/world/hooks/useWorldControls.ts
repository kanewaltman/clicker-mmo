import { useCallback, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';

export const useWorldControls = (
  worldPosition: { x: number; y: number },
  mousePosition: { x: number; y: number },
  updateCursorPosition: (x: number, y: number) => void,
  resetAFKTimer: () => void
) => {
  const setWorldPosition = useGameStore((state) => state.setWorldPosition);

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

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousewheel', handleWheel as any, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousewheel', handleWheel as any);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};