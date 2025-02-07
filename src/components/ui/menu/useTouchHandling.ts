import { useCallback, useRef } from 'react';

interface TouchHandlingOptions {
  onClose: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

export function useTouchHandling({ onClose, setIsOpen }: TouchHandlingOptions) {
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const initialTouchY = useRef(0);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const touchStartTarget = useRef<EventTarget | null>(null);
  const hasScrolled = useRef(false);
  const touchStartScrollTop = useRef(0);
  const touchDirectionLocked = useRef(false);
  const initialScrollDirection = useRef<'up' | 'down' | null>(null);

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
    touchStartTarget.current = target;
    hasScrolled.current = false;
    touchDirectionLocked.current = false;
    initialScrollDirection.current = null;

    // Store initial scroll position of scrollable content
    const scrollableContent = target.closest('.overflow-y-auto');
    if (scrollableContent instanceof HTMLElement) {
      touchStartScrollTop.current = scrollableContent.scrollTop;
    }

    // Find the sheet element
    const sheet = target.closest('[role="navigation"]');
    if (sheet instanceof HTMLElement) {
      sheet.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStartY.current;
    const scrollableContent = (touchStartTarget.current as HTMLElement)?.closest('.overflow-y-auto');
    
    // Determine initial scroll direction if not set
    if (!touchDirectionLocked.current && Math.abs(deltaY) > 5) {
      initialScrollDirection.current = deltaY > 0 ? 'down' : 'up';
    }

    // Handle scrollable content
    if (scrollableContent instanceof HTMLElement) {
      const isAtTop = scrollableContent.scrollTop === 0;
      const isAtBottom = Math.abs(
        scrollableContent.scrollHeight - scrollableContent.scrollTop - scrollableContent.clientHeight
      ) < 1;

      // Lock scroll direction after initial movement
      if (!touchDirectionLocked.current && Math.abs(deltaY) > 10) {
        touchDirectionLocked.current = true;

        // If starting scroll down and not at top, lock to scroll
        if (deltaY > 0 && !isAtTop) {
          hasScrolled.current = true;
          isDragging.current = false;
          return;
        }

        // If starting scroll up and not at bottom, lock to scroll
        if (deltaY < 0 && !isAtBottom) {
          hasScrolled.current = true;
          isDragging.current = false;
          return;
        }
      }

      // Prevent sheet movement if we're scrolling content
      if (hasScrolled.current) return;

      // Only allow pull-to-close when at the top and pulling down
      if (!isAtTop && deltaY > 0) {
        isDragging.current = false;
        return;
      }
    }

    // Handle sheet movement
    if (deltaY < 0) {
      const absUpwardDelta = Math.abs(deltaY);
      const resistance = 3 + (absUpwardDelta / 50);
      dragCurrentY.current = deltaY / resistance;
    } else {
      dragCurrentY.current = deltaY;
    }

    lastTouchY.current = touch.clientY;
    lastTouchTime.current = e.timeStamp;
    
    // Update sheet position
    const sheet = e.currentTarget.closest('[role="navigation"]');
    if (sheet instanceof HTMLElement) {
      sheet.style.transform = `translate3d(0, ${dragCurrentY.current}px, 0)`;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    e.stopPropagation();
    isDragging.current = false;
    hasScrolled.current = false;
    touchDirectionLocked.current = false;
    initialScrollDirection.current = null;
    
    const touchDuration = e.timeStamp - lastTouchTime.current;
    const touchDistance = e.changedTouches[0].clientY - lastTouchY.current;
    const velocity = touchDistance / touchDuration;
    
    const threshold = window.innerHeight * 0.05;
    
    // Find the sheet element
    const sheet = e.currentTarget.closest('[role="navigation"]');
    if (!(sheet instanceof HTMLElement)) return;

    if (dragCurrentY.current > threshold || velocity > 0.2) {
      const duration = Math.min(Math.abs(velocity) * 500, 300);
      sheet.style.transition = `transform ${duration}ms cubic-bezier(0.33, 1, 0.68, 1)`;
      sheet.style.transform = 'translate3d(0, 100%, 0)';
      
      setTimeout(() => {
        onClose();
        setIsOpen(false);
      }, duration);
    } else {
      sheet.style.transition = 'transform 200ms cubic-bezier(0.33, 1, 0.68, 1)';
      sheet.style.transform = 'translate3d(0, 0, 0)';
    }
    
    dragCurrentY.current = 0;
  }, [onClose, setIsOpen]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}