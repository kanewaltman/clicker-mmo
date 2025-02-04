import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { BROADCAST_INTERVAL, INTERPOLATION_SPEED } from '../constants';

export interface CursorWithInterpolation {
  id: string;
  x: number;
  y: number;
  username: string;
  emoji: string;
  points: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  lastUpdate: number;
  isAFK: boolean;
}

export const useCursorSync = (
  userId: string,
  isAFK: boolean,
  worldPosition: { x: number; y: number },
  username: string,
  cursorEmoji: string,
  resources: number
) => {
  const [cursors, setCursors] = useState<CursorWithInterpolation[]>([]);
  const channelRef = useRef<any>(null);
  const lastBroadcastRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const isInitializedRef = useRef(false);

  const updateCursorPosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastBroadcastRef.current < BROADCAST_INTERVAL) return;
    
    lastBroadcastRef.current = now;
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          id: userId,
          x: x - worldPosition.x,
          y: y - worldPosition.y,
          username,
          emoji: cursorEmoji,
          points: resources,
          isAFK
        }
      }).catch(console.error);
    }
  }, [userId, worldPosition, username, cursorEmoji, resources, isAFK]);

  useEffect(() => {
    if (isInitializedRef.current) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      isInitializedRef.current = false;
    }

    const channel = supabase.channel('cursors', {
      config: {
        broadcast: { self: false }
      }
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.id === userId) return; // Ignore own cursor

        setCursors(prevCursors => {
          const now = Date.now();
          const existingIndex = prevCursors.findIndex(c => c.id === payload.id);
          
          if (existingIndex >= 0) {
            const updated = [...prevCursors];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...payload,
              targetX: payload.x,
              targetY: payload.y,
              lastUpdate: now
            };
            return updated;
          }
          
          return [...prevCursors, {
            ...payload,
            currentX: payload.x,
            currentY: payload.y,
            targetX: payload.x,
            targetY: payload.y,
            lastUpdate: now
          }];
        });
      });

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isInitializedRef.current = true;
      }
    });

    const animate = () => {
      setCursors(prevCursors => {
        const now = Date.now();
        return prevCursors
          .filter(cursor => now - cursor.lastUpdate < 30000)
          .map(cursor => ({
            ...cursor,
            currentX: cursor.currentX + (cursor.targetX - cursor.currentX) * INTERPOLATION_SPEED,
            currentY: cursor.currentY + (cursor.targetY - cursor.currentY) * INTERPOLATION_SPEED
          }));
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [userId]);

  return { cursors, updateCursorPosition };
};