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
  const isScrollable = useRef(false);

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

    // Check if content is scrollable
    const scrollableContent = target.closest('.overflow-y-auto');
    if (scrollableContent instanceof HTMLElement) {
      touchStartScrollTop.current = scrollableContent.scrollTop;
      isScrollable.current = scrollableContent.scrollHeight > scrollableContent.clientHeight;
    } else {
      isScrollable.current = false;
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
      const isAtTop = scrollableContent.scrollTop <= 0;
      const isAtBottom = Math.abs(
        scrollableContent.scrollHeight - scrollableContent.scrollTop - scrollableContent.clientHeight
      ) <= 1;

      // If content is not scrollable, treat as sheet movement
      if (!isScrollable.current) {
        if (deltaY > 0) { // Pulling down
          dragCurrentY.current = deltaY;
        } else {
          const resistance = 3 + (Math.abs(deltaY) / 50);
          dragCurrentY.current = deltaY / resistance;
        }
      }
      // Content is scrollable
      else {
        // Lock scroll direction after initial movement
        if (!touchDirectionLocked.current && Math.abs(deltaY) > 10) {
          touchDirectionLocked.current = true;

          // If pulling down and at top, lock to sheet movement
          if (deltaY > 0 && isAtTop) {
            hasScrolled.current = false;
          }
          // Otherwise lock to scroll
          else {
            hasScrolled.current = true;
            isDragging.current = false;
            return;
          }
        }

        // Allow sheet movement only when at top and pulling down
        if (isAtTop && deltaY > 0) {
          dragCurrentY.current = deltaY;
          hasScrolled.current = false;
        } else {
          hasScrolled.current = true;
          isDragging.current = false;
          return;
        }
      }
    } else {
      // No scrollable content, handle sheet movement
      if (deltaY > 0) {
        dragCurrentY.current = deltaY;
      } else {
        const resistance = 3 + (Math.abs(deltaY) / 50);
        dragCurrentY.current = deltaY / resistance;
      }
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
    
    const threshold = window.innerHeight * 0.15; // Increased threshold
    
    // Find the sheet element
    const sheet = e.currentTarget.closest('[role="navigation"]');
    if (!(sheet instanceof HTMLElement)) return;

    if (dragCurrentY.current > threshold || velocity > 0.5) { // Increased velocity threshold
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