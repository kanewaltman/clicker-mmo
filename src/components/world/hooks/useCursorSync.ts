import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { BROADCAST_INTERVAL, INTERPOLATION_SPEED } from '../constants';

const CURSOR_TIMEOUT = 30000; // 30 seconds before cursor disappears

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

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      
      setCursors(prevCursors => {
        const activeCursors = prevCursors.filter(
          cursor => now - cursor.lastUpdate < CURSOR_TIMEOUT
        );
        
        return activeCursors.map(cursor => {
          const timeSinceUpdate = now - cursor.lastUpdate;
          const isAFK = timeSinceUpdate > 5000; // Mark as AFK after 5 seconds of no updates
          
          return {
            ...cursor,
            currentX: cursor.currentX + (cursor.targetX - cursor.currentX) * INTERPOLATION_SPEED,
            currentY: cursor.currentY + (cursor.targetY - cursor.currentY) * INTERPOLATION_SPEED,
            isAFK
          };
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel('cursors', {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        const cursor = payload as Omit<CursorWithInterpolation, 'currentX' | 'currentY' | 'targetX' | 'targetY' | 'lastUpdate' | 'isAFK'>;
        setCursors(prevCursors => {
          const now = Date.now();
          const existingIndex = prevCursors.findIndex(c => c.id === cursor.id);
          
          if (existingIndex >= 0) {
            const updated = [...prevCursors];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...cursor,
              targetX: cursor.x,
              targetY: cursor.y,
              lastUpdate: now,
              isAFK: false
            };
            return updated;
          }
          
          return [...prevCursors, {
            ...cursor,
            currentX: cursor.x,
            currentY: cursor.y,
            targetX: cursor.x,
            targetY: cursor.y,
            lastUpdate: now,
            isAFK: false
          }];
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const updateCursorPosition = (x: number, y: number) => {
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
          points: resources
        }
      });
    }
  };

  return { cursors, updateCursorPosition };
};