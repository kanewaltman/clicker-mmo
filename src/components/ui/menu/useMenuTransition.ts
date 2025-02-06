import { useCallback, useRef } from 'react';
import type { MenuView, MenuTransitionOptions } from './types';

const DEFAULT_OPTIONS: MenuTransitionOptions = {
  duration: 280,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Changed to ease-in-out
  direction: 'right'
};

export function useMenuTransition(
  containerRef: React.RefObject<HTMLDivElement>,
  sheetRef: React.RefObject<HTMLDivElement>,
  viewHeightCache: React.MutableRefObject<Record<MenuView, number>>,
  setIsTransitioning: (value: boolean) => void
) {
  const settleTimeoutRef = useRef<number>();

  const handleViewTransition = useCallback((
    currentView: MenuView,
    nextView: MenuView,
    options: MenuTransitionOptions = {}
  ) => {
    const { duration, easing, direction } = { ...DEFAULT_OPTIONS, ...options };

    if (!containerRef.current || !sheetRef.current) return;
    
    const container = containerRef.current;
    const sheet = sheetRef.current;
    
    // Update height with animation
    const currentHeight = sheet.offsetHeight;
    const targetHeight = viewHeightCache.current[nextView];
    
    sheet.style.height = `${currentHeight}px`;
    // Keep the bouncy animation for height changes
    sheet.style.transition = `height ${duration}ms cubic-bezier(0.32, 1.75, 0.65, 0.88)`;
    
    void sheet.offsetHeight; // Force reflow
    
    sheet.style.height = `${targetHeight}px`;

    // Set up the views for animation
    const views = Array.from(container.children) as HTMLElement[];
    const translateDirection = direction === 'right' ? 1 : -1;

    // Reset all views first
    views.forEach(view => {
      view.style.display = 'none';
      view.style.position = '';
      view.style.top = '';
      view.style.left = '';
      view.style.width = '';
      view.style.transform = '';
      view.style.opacity = '';
      view.style.transition = '';
    });

    // Show and position the views we want to animate
    views.forEach(view => {
      if (view.classList.contains(`${currentView}-view-content`) || 
          view.classList.contains(`${nextView}-view-content`)) {
        view.style.display = 'block';
        view.style.position = 'absolute';
        view.style.top = '0';
        view.style.left = '0';
        view.style.width = '100%';
      }

      if (view.classList.contains(`${currentView}-view-content`)) {
        view.style.transform = 'translateX(0)';
        view.style.opacity = '1';
      }
      
      if (view.classList.contains(`${nextView}-view-content`)) {
        view.style.transform = `translateX(${translateDirection * 100}%)`;
        view.style.opacity = '0';
      }
    });

    // Force reflow
    void container.offsetHeight;

    // Add transitions with ease-in-out for content slides
    views.forEach(view => {
      if (view.classList.contains(`${currentView}-view-content`) || 
          view.classList.contains(`${nextView}-view-content`)) {
        view.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
      }
    });

    // Trigger animations
    views.forEach(view => {
      if (view.classList.contains(`${currentView}-view-content`)) {
        view.style.transform = `translateX(${-translateDirection * 100}%)`;
        view.style.opacity = '0';
      }
      if (view.classList.contains(`${nextView}-view-content`)) {
        view.style.transform = 'translateX(0)';
        view.style.opacity = '1';
      }
    });

    // Cleanup after animation
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    settleTimeoutRef.current = window.setTimeout(() => {
      views.forEach(view => {
        if (view.classList.contains(`${currentView}-view-content`)) {
          view.style.display = 'none';
          view.style.position = '';
          view.style.top = '';
          view.style.left = '';
          view.style.width = '';
          view.style.transform = '';
          view.style.opacity = '';
          view.style.transition = '';
        }
        if (view.classList.contains(`${nextView}-view-content`)) {
          view.style.display = 'block';
          view.style.position = 'relative';
          view.style.top = '';
          view.style.left = '';
          view.style.width = '';
          view.style.transform = '';
          view.style.opacity = '';
          view.style.transition = '';
        }
      });

      // Keep the bouncy settle animation for height
      sheet.style.transition = 'height 120ms cubic-bezier(0.32, 1.75, 0.65, 0.88)';
      setIsTransitioning(false);
    }, duration);
  }, [containerRef, sheetRef, viewHeightCache, setIsTransitioning]);

  return handleViewTransition;
}