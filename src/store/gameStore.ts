import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { getRandomSpawnPosition, selectRandomResource } from '../config/lootTable';

interface GameState {
  worldPosition: { x: number; y: number };
  resources: number;
  camps: Camp[];
  username: string;
  cursorEmoji: string;
  inventory: Inventory;
  structures: Structure[];
  worldResources: WorldResource[];
  afkTimeout: number;
  setWorldPosition: (x: number, y: number) => void;
  addResources: (amount: number) => void;
  addCamp: (camp: Camp) => void;
  setUsername: (name: string) => void;
  setCursorEmoji: (emoji: string) => void;
  setAfkTimeout: (timeout: number) => void;
  teleportToCastle: () => void;
  buyPickaxe: () => void;
  placeStructure: (structure: Omit<Structure, 'id' | 'health'>) => void;
  damageStructure: (id: string, damage: number) => void;
  removeStructure: (id: string) => void;
  retrieveStructure: (id: string) => void;
  updateStructurePosition: (id: string, x: number, y: number) => void;
  syncStructures: (structures: Structure[]) => void;
  loadStructures: () => Promise<void>;
  loadWorldResources: () => Promise<void>;
  damageResource: (id: string, damage: number) => Promise<void>;
  syncWorldResources: (resources: WorldResource[]) => void;
}

interface Camp {
  id: string;
  position: { x: number; y: number };
  resourceType: string;
  lastCollected: Date;
}

interface Inventory {
  pickaxes: number;
}

export interface Structure {
  id: string;
  type: 'pickaxe';
  position: { x: number; y: number };
  owner: string;
  health: number;
  lastGather: number;
}

export interface WorldResource {
  id: string;
  type: 'wood' | 'stone' | 'iron' | 'diamond';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  position: { x: number; y: number };
  maxHealth: number;
  currentHealth: number;
  valuePerClick: number;
  emoji: string;
}

const PICKAXE_COST = 100;
const STRUCTURE_MAX_HEALTH = 1000;
const RETRIEVE_COST = 50;
const DEFAULT_AFK_TIMEOUT = 5000;

// Track spawning state to prevent multiple spawns
let isSpawning = false;
let resourceChannel: any = null;
let structureChannel: any = null;

const transformDatabaseStructure = (dbStructure: any): Structure => ({
  id: dbStructure.id,
  type: dbStructure.type,
  position: {
    x: dbStructure.position_x,
    y: dbStructure.position_y
  },
  owner: dbStructure.owner,
  health: dbStructure.health,
  lastGather: new Date(dbStructure.last_gather).getTime()
});

const transformDatabaseResource = (dbResource: any): WorldResource => ({
  id: dbResource.id,
  type: dbResource.type,
  rarity: dbResource.rarity,
  position: {
    x: dbResource.position_x,
    y: dbResource.position_y
  },
  maxHealth: dbResource.max_health,
  currentHealth: dbResource.current_health,
  valuePerClick: dbResource.value_per_click,
  emoji: dbResource.emoji
});

const spawnNewResource = async () => {
  if (isSpawning) return null;
  
  try {
    isSpawning = true;
    const store = useGameStore.getState();
    const position = getRandomSpawnPosition(store.worldResources);
    const resourceConfig = selectRandomResource();
    
    const { data: newResource, error } = await supabase
      .from('resources')
      .insert({
        type: resourceConfig.type,
        rarity: resourceConfig.rarity,
        position_x: position.x,
        position_y: position.y,
        max_health: resourceConfig.stats.maxHealth,
        current_health: resourceConfig.stats.maxHealth,
        value_per_click: resourceConfig.stats.valuePerClick,
        emoji: resourceConfig.emoji
      })
      .select()
      .single();

    if (error) throw error;
    return transformDatabaseResource(newResource);
  } catch (error) {
    console.error('Error spawning new resource:', error);
    return null;
  } finally {
    setTimeout(() => {
      isSpawning = false;
    }, 1000); // Keep spawning locked for 1 second
  }
};

// Initialize subscriptions
if (resourceChannel) {
  resourceChannel.unsubscribe();
}

if (structureChannel) {
  structureChannel.unsubscribe();
}

resourceChannel = supabase
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
          const updatedResource = transformDatabaseResource(payload.new);
          store.syncWorldResources(
            store.worldResources.map(r => 
              r.id === updatedResource.id ? updatedResource : r
            )
          );
          break;
        }
        case 'INSERT': {
          const newResource = transformDatabaseResource(payload.new);
          store.syncWorldResources([...store.worldResources, newResource]);
          break;
        }
      }
    }
  )
  .subscribe();

structureChannel = supabase
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
          const updatedStructure = transformDatabaseStructure(payload.new);
          store.syncStructures(
            store.structures.map(s => 
              s.id === updatedStructure.id ? updatedStructure : s
            )
          );
          break;
        }
        case 'INSERT': {
          const newStructure = transformDatabaseStructure(payload.new);
          store.syncStructures([...store.structures, newStructure]);
          break;
        }
      }
    }
  )
  .subscribe();

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      worldPosition: { x: 0, y: 0 },
      resources: 0,
      camps: [],
      username: 'Player',
      cursorEmoji: '👆',
      inventory: {
        pickaxes: 0
      },
      structures: [],
      worldResources: [],
      afkTimeout: DEFAULT_AFK_TIMEOUT,

      loadStructures: async () => {
        try {
          const { data: structures, error } = await supabase
            .from('structures')
            .select('*');

          if (error) throw error;

          const transformedStructures = structures.map(transformDatabaseStructure);
          set({ structures: transformedStructures });
        } catch (error) {
          console.error('Error loading structures:', error);
        }
      },

      loadWorldResources: async () => {
        try {
          const { data: resources, error } = await supabase
            .from('resources')
            .select('*')
            .gt('current_health', 0);

          if (error) throw error;

          const transformedResources = resources.map(transformDatabaseResource);
          set({ worldResources: transformedResources });
        } catch (error) {
          console.error('Error loading resources:', error);
        }
      },

      setWorldPosition: (x, y) => set({ worldPosition: { x, y } }),
      addResources: (amount) => set((state) => ({ resources: state.resources + amount })),
      addCamp: (camp) => set((state) => ({ camps: [...state.camps, camp] })),
      setUsername: (name) => set({ username: name }),
      setCursorEmoji: (emoji) => set({ cursorEmoji: emoji }),
      setAfkTimeout: (timeout) => set({ afkTimeout: timeout }),

      teleportToCastle: () => {
        const currentResources = get().resources;
        const teleportCost = Math.floor(currentResources * 0.5);
        set({
          worldPosition: { x: 0, y: 0 },
          resources: currentResources - teleportCost
        });
      },

      buyPickaxe: () => set((state) => {
        if (state.resources >= PICKAXE_COST) {
          return {
            resources: state.resources - PICKAXE_COST,
            inventory: {
              ...state.inventory,
              pickaxes: state.inventory.pickaxes + 1
            }
          };
        }
        return state;
      }),

      placeStructure: async (structure) => {
        try {
          const { data: newStructure, error } = await supabase
            .from('structures')
            .insert({
              type: structure.type,
              position_x: structure.position.x,
              position_y: structure.position.y,
              owner: structure.owner,
              health: STRUCTURE_MAX_HEALTH,
              last_gather: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          const transformedStructure = transformDatabaseStructure(newStructure);

          set((state) => ({
            structures: [...state.structures, transformedStructure],
            inventory: {
              ...state.inventory,
              pickaxes: state.inventory.pickaxes - 1
            }
          }));
        } catch (error) {
          console.error('Error placing structure:', error);
        }
      },

      damageStructure: async (id, damage) => {
        try {
          const structure = get().structures.find(s => s.id === id);
          if (!structure) return;

          const newHealth = Math.max(0, structure.health - damage);

          const { error } = await supabase
            .from('structures')
            .update({ health: newHealth })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            structures: state.structures.map(s =>
              s.id === id ? { ...s, health: newHealth } : s
            )
          }));
        } catch (error) {
          console.error('Error damaging structure:', error);
        }
      },

      removeStructure: async (id) => {
        try {
          const { error } = await supabase
            .from('structures')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            structures: state.structures.filter(s => s.id !== id)
          }));
        } catch (error) {
          console.error('Error removing structure:', error);
        }
      },

      retrieveStructure: async (id) => {
        try {
          if (get().resources < RETRIEVE_COST) return;

          const { error } = await supabase
            .from('structures')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            structures: state.structures.filter(s => s.id !== id),
            resources: state.resources - RETRIEVE_COST,
            inventory: {
              ...state.inventory,
              pickaxes: state.inventory.pickaxes + 1
            }
          }));
        } catch (error) {
          console.error('Error retrieving structure:', error);
        }
      },

      updateStructurePosition: async (id, x, y) => {
        try {
          const { error } = await supabase
            .from('structures')
            .update({
              position_x: x,
              position_y: y
            })
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            structures: state.structures.map(structure =>
              structure.id === id
                ? { ...structure, position: { x, y } }
                : structure
            )
          }));
        } catch (error) {
          console.error('Error updating structure position:', error);
        }
      },

      damageResource: async (id: string, damage: number) => {
        try {
          const resource = get().worldResources.find(r => r.id === id);
          if (!resource) return;

          const newHealth = Math.max(0, resource.currentHealth - damage);
          const rewardAmount = resource.valuePerClick;

          // Update local state immediately for better UX
          set((state) => ({
            worldResources: state.worldResources.map(r =>
              r.id === id ? { ...r, currentHealth: newHealth } : r
            ),
            resources: state.resources + rewardAmount
          }));

          if (newHealth <= 0) {
            // Delete the resource
            const { error: deleteError } = await supabase
              .from('resources')
              .delete()
              .eq('id', id);

            if (deleteError) throw deleteError;

            // Only spawn a new resource if we successfully deleted the old one
            await spawnNewResource();
          } else {
            // Update the resource health
            const { error: updateError } = await supabase
              .from('resources')
              .update({ current_health: newHealth })
              .eq('id', id);

            if (updateError) throw updateError;
          }
        } catch (error) {
          console.error('Error damaging resource:', error);
          // Revert local state if there was an error
          await get().loadWorldResources();
        }
      },

      syncStructures: (structures) => set({ structures }),
      syncWorldResources: (resources) => set({ worldResources: resources })
    }),
    {
      name: 'game-storage',
    }
  )
);