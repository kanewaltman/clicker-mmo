import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { UserState, createUserSlice } from './slices/userSlice';
import { WorldState, createWorldSlice } from './slices/worldSlice';
import { StructureState, createStructureSlice } from './slices/structureSlice';

interface GameState extends UserState, WorldState, StructureState {}

let saveTimeout: number | null = null;

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
        hideCursorWhilePanning: state.hideCursorWhilePanning
      })
    }
  )
);

// Set up Supabase auth state sync
supabase.auth.onAuthStateChange((event, session) => {
  const store = useGameStore.getState();
  
  if (event === 'SIGNED_IN') {
    store.setUser(session?.user ?? null);
    store.loadUserProgress();
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
  }
});

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

const structureChannel = supabase
  .channel('structure-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'structures'
    },
    async (payload) => {
      const store = useGameStore.getState();
      
      switch (payload.eventType) {
        case 'DELETE': {
          store.syncStructures(
            store.structures.filter(s => s.id !== payload.old.id)
          );
          break;
        }
        case 'UPDATE': {
          const updatedStructure = {
            id: payload.new.id,
            type: payload.new.type,
            position: {
              x: payload.new.position_x,
              y: payload.new.position_y
            },
            owner: payload.new.owner,
            health: payload.new.health,
            lastGather: new Date(payload.new.last_gather).getTime()
          };
          
          store.syncStructures(
            store.structures.map(s => 
              s.id === updatedStructure.id ? updatedStructure : s
            )
          );
          break;
        }
        case 'INSERT': {
          const newStructure = {
            id: payload.new.id,
            type: payload.new.type,
            position: {
              x: payload.new.position_x,
              y: payload.new.position_y
            },
            owner: payload.new.owner,
            health: payload.new.health,
            lastGather: new Date(payload.new.last_gather).getTime()
          };
          
          if (!store.structures.some(s => s.id === newStructure.id)) {
            store.syncStructures([...store.structures, newStructure]);
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
  structureChannel.unsubscribe();
  if (saveTimeout) {
    window.clearTimeout(saveTimeout);
  }
});

export { useGameStore };
export type { GameState, Structure, WorldResource };