import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { UserState, createUserSlice } from './slices/userSlice';
import { WorldState, createWorldSlice } from './slices/worldSlice';
import { StructureState, createStructureSlice } from './slices/structureSlice';

interface GameState extends UserState, WorldState, StructureState {}

let saveTimeout: number | null = null;
let authInitialized = false;

const debouncedSave = (store: GameState) => {
  if (saveTimeout) {
    window.clearTimeout(saveTimeout);
  }
  
  saveTimeout = window.setTimeout(() => {
    store.saveUserProgress();
    saveTimeout = null;
  }, 1000);
};

const useGameStore = create<GameState>()(
  persist(
    (...a) => ({
      ...createUserSlice(...a),
      ...createWorldSlice(...a),
      ...createStructureSlice(...a)
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        username: state.username,
        cursorEmoji: state.cursorEmoji,
        afkTimeout: state.afkTimeout,
        hideCursorWhilePanning: state.hideCursorWhilePanning,
        worldPosition: state.worldPosition
      })
    }
  )
);

// Initialize auth state
const initializeAuth = async () => {
  if (authInitialized) return;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const store = useGameStore.getState();
    
    if (session?.user) {
      store.setUser(session.user);
      await store.loadUserProgress();
      if (store.position) {
        store.setWorldPosition(store.position.x, store.position.y);
      }
    } else {
      store.setUser(null);
    }
  } catch (error) {
    console.error('Error initializing auth:', error);
    const store = useGameStore.getState();
    store.setUser(null);
  } finally {
    authInitialized = true;
  }
};

// Set up Supabase auth state sync
supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useGameStore.getState();
  
  try {
    if (event === 'SIGNED_IN') {
      store.setUser(session?.user ?? null);
      await store.loadUserProgress();
      if (store.position) {
        store.setWorldPosition(store.position.x, store.position.y);
      }
    } else if (event === 'SIGNED_OUT') {
      store.setUser(null);
      store.setResources(0);
      store.setWorldPosition(0, 0);
    }
  } catch (error) {
    console.error('Error handling auth state change:', error);
    store.setUser(null);
  }
});

// Initialize auth on load
initializeAuth().catch(console.error);

// Set up Supabase realtime subscriptions
const resourceChannel = supabase
  .channel('db-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'resources'
    },
    async (payload) => {
      const store = useGameStore.getState();
      
      switch (payload.eventType) {
        case 'DELETE': {
          store.syncWorldResources(
            store.worldResources.filter(r => r.id !== payload.old.id)
          );
          break;
        }
        case 'UPDATE': {
          const updatedResource = {
            id: payload.new.id,
            type: payload.new.type,
            rarity: payload.new.rarity,
            position: {
              x: payload.new.position_x,
              y: payload.new.position_y
            },
            maxHealth: payload.new.max_health,
            currentHealth: payload.new.current_health,
            valuePerClick: payload.new.value_per_click,
            emoji: payload.new.emoji,
            created_at: payload.new.created_at
          };
          
          store.syncWorldResources(
            store.worldResources.map(r => 
              r.id === updatedResource.id ? updatedResource : r
            )
          );
          break;
        }
        case 'INSERT': {
          const newResource = {
            id: payload.new.id,
            type: payload.new.type,
            rarity: payload.new.rarity,
            position: {
              x: payload.new.position_x,
              y: payload.new.position_y
            },
            maxHealth: payload.new.max_health,
            currentHealth: payload.new.current_health,
            valuePerClick: payload.new.value_per_click,
            emoji: payload.new.emoji,
            created_at: payload.new.created_at
          };
          
          if (!store.worldResources.some(r => r.id === newResource.id)) {
            store.syncWorldResources([...store.worldResources, newResource]);
          }
          break;
        }
      }
    }
  )
  .subscribe();

// Cleanup on window unload
window.addEventListener('unload', () => {
  resourceChannel.unsubscribe();
  if (saveTimeout) {
    window.clearTimeout(saveTimeout);
  }
});

export { useGameStore };
export type { GameState, Structure, WorldResource };