import { useCallback, useMemo } from 'react';
import { WorldPosition } from '../../../store/slices/worldSlice';

const VIEWPORT_PADDING = 200; // Extra padding around viewport to prevent pop-in

export function useViewportCulling() {
  const isInViewport = useCallback((position: WorldPosition, worldPosition: WorldPosition): boolean => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate screen coordinates
    const screenX = position.x + worldPosition.x;
    const screenY = position.y + worldPosition.y;
    
    // Check if within padded viewport
    return (
      screenX >= -VIEWPORT_PADDING &&
      screenX <= viewportWidth + VIEWPORT_PADDING &&
      screenY >= -VIEWPORT_PADDING &&
      screenY <= viewportHeight + VIEWPORT_PADDING
    );
  }, []);

  return { isInViewport };
}