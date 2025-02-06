import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';

export interface UserState {
  user: any | null;
  username: string;
  cursorEmoji: string;
  afkTimeout: number;
  hideCursorWhilePanning: boolean;
  progressId: string | null;
  resources: number;
  setUser: (user: any | null) => void;
  setUsername: (name: string) => void;
  setCursorEmoji: (emoji: string) => void;
  setAfkTimeout: (timeout: number) => void;
  setHideCursorWhilePanning: (hide: boolean) => void;
  loadUserProgress: () => Promise<void>;
  saveUserProgress: () => Promise<void>;
}

export const createUserSlice: StateCreator<UserState> = (set, get) => ({
  user: null,
  username: 'Player',
  cursorEmoji: '👆',
  afkTimeout: 5000,
  hideCursorWhilePanning: false,
  progressId: null,
  resources: 0,

  setUser: (user) => {
    set({ user });
    if (!user) {
      set({
        progressId: null,
        resources: 0
      });
    }
  },

  setUsername: (name) => set({ username: name }),
  setCursorEmoji: (emoji) => set({ cursorEmoji: emoji }),
  setAfkTimeout: (timeout) => set({ afkTimeout: timeout }),
  setHideCursorWhilePanning: (hide) => set({ hideCursorWhilePanning: hide }),

  loadUserProgress: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data: progressRecords, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const latestProgress = progressRecords?.[0];
      
      if (latestProgress) {
        set({
          progressId: latestProgress.id,
          username: latestProgress.username || get().username,
          resources: latestProgress.resources || 0
        });
      } else {
        const { data: newProgress, error: insertError } = await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            username: get().username,
            resources: 0
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newProgress) {
          set({ 
            progressId: newProgress.id,
            resources: 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  },

  saveUserProgress: async () => {
    const { user, progressId, username, resources } = get();
    if (!user) return;

    try {
      const progressData = {
        user_id: user.id,
        username,
        resources,
        updated_at: new Date().toISOString()
      };

      if (progressId) {
        const { error } = await supabase
          .from('user_progress')
          .update(progressData)
          .eq('id', progressId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { data: newProgress, error } = await supabase
          .from('user_progress')
          .insert(progressData)
          .select()
          .single();

        if (error) throw error;
        if (newProgress) {
          set({ progressId: newProgress.id });
        }
      }
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }
});