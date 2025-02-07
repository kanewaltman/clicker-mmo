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

    // Store initial scroll position of scrollable content
    const scrollableContent = target.closest('.overflow-y-auto');
    if (scrollableContent) {
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
    
    // Determine scroll direction if not locked
    if (!touchDirectionLocked.current) {
      const absY = Math.abs(deltaY);
      if (absY > 10) { // Add a small threshold before locking direction
        touchDirectionLocked.current = true;
        // If scrollable content exists and is not at top, or is at bottom
        if (scrollableContent) {
          const isAtTop = scrollableContent.scrollTop === 0;
          const isAtBottom = scrollableContent.scrollHeight - scrollableContent.scrollTop === scrollableContent.clientHeight;
          
          // Allow vertical scrolling if content is scrollable and not at boundaries
          if (!isAtTop && deltaY < 0) {
            hasScrolled.current = true;
            isDragging.current = false;
            return;
          }
          
          // Prevent dragging down if not at top
          if (!isAtTop && deltaY > 0) {
            hasScrolled.current = true;
            isDragging.current = false;
            return;
          }

          // Allow dragging up if at bottom
          if (isAtBottom && deltaY < 0) {
            hasScrolled.current = false;
          }
        }
      }
    }

    if (hasScrolled.current) return;

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
    
    // Find and transform the sheet element
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