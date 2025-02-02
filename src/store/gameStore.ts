import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { getRandomSpawnPosition, selectRandomResource, LOOT_TABLE } from '../config/lootTable';
import { RESOURCE_BALANCE, calculateResourceDeficit, getResourceTypeByProbability } from '../config/resourceBalance';

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
  user: any | null;
  progressId: string | null;
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
  setUser: (user: any | null) => void;
  loadUserProgress: () => Promise<void>;
  saveUserProgress: () => Promise<void>;
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

let isSpawning = false;
let resourceChannel: any = null;
let structureChannel: any = null;
let balanceInterval: number | null = null;
let saveTimeout: number | null = null;

const cleanId = (id: string, prefix: string) => id.replace(`${prefix}-`, '');

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

async function balanceResources() {
  const store = useGameStore.getState();
  const deficit = calculateResourceDeficit(store.worldResources, RESOURCE_BALANCE.maxDistance);
  
  if (deficit > 0) {
    const batchSize = Math.min(deficit, RESOURCE_BALANCE.spawnBatchSize);
    const spawnPromises = [];

    for (let i = 0; i < batchSize; i++) {
      const rarity = getResourceTypeByProbability();
      const resource = LOOT_TABLE.find(r => r.rarity === rarity);
      if (!resource) continue;

      const position = getRandomSpawnPosition(store.worldResources);
      
      spawnPromises.push(
        supabase
          .from('resources')
          .insert({
            type: resource.type,
            rarity: resource.rarity,
            position_x: position.x,
            position_y: position.y,
            max_health: resource.stats.maxHealth,
            current_health: resource.stats.maxHealth,
            value_per_click: resource.stats.valuePerClick,
            emoji: resource.emoji
          })
          .select()
      );
    }

    try {
      await Promise.all(spawnPromises);
    } catch (error) {
      console.error('Error balancing resources:', error);
    }
  }
}

function startResourceBalancing() {
  if (balanceInterval) return;
  balanceInterval = window.setInterval(balanceResources, RESOURCE_BALANCE.checkInterval);
}

function stopResourceBalancing() {
  if (balanceInterval) {
    window.clearInterval(balanceInterval);
    balanceInterval = null;
  }
}

startResourceBalancing();
window.addEventListener('unload', stopResourceBalancing);

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
    }, 1000);
  }
};

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
          if (!store.worldResources.some(r => r.id === newResource.id)) {
            store.syncWorldResources([...store.worldResources, newResource]);
          }
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
          if (!store.structures.some(s => s.id === newStructure.id)) {
            store.syncStructures([...store.structures, newStructure]);
          }
          break;
        }
      }
    }
  )
  .subscribe();

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
      user: null,
      progressId: null,

      loadStructures: async () => {
        try {
          const { data: structures, error } = await supabase
            .from('structures')
            .select('*');

          if (error) throw error;

          const transformedStructures = structures.map(transformDatabaseStructure);
          const uniqueStructures = Array.from(
            new Map(transformedStructures.map(s => [s.id, s])).values()
          );
          set({ structures: uniqueStructures });
        } catch (error) {
          console.error('Error loading structures:', error);
        }
      },

      loadWorldResources: async () => {
        try {
          const { data: resources, error } = await supabase
            .from('resources')
            .select('*');

          if (error) throw error;

          const transformedResources = resources?.map(transformDatabaseResource) || [];
          const uniqueResources = Array.from(
            new Map(transformedResources.map(r => [r.id, r])).values()
          );
          
          set({ worldResources: uniqueResources });
          await balanceResources();
        } catch (error) {
          console.error('Error loading resources:', error);
        }
      },

      setWorldPosition: (x, y) => {
        set((state) => {
          const newPosition = { x, y };
          const newState = { worldPosition: newPosition };
          
          if (state.user) {
            debouncedSave({ ...state, ...newState });
          }
          
          return newState;
        });
      },
      
      addResources: (amount) => {
        set((state) => {
          const newResources = state.resources + amount;
          const newState = { resources: newResources };
          
          if (state.user) {
            debouncedSave({ ...state, ...newState });
          }
          
          return newState;
        });
      },

      addCamp: (camp) => set((state) => ({ camps: [...state.camps, camp] })),
      setUsername: (name) => set({ username: name }),
      setCursorEmoji: (emoji) => set({ cursorEmoji: emoji }),
      setAfkTimeout: (timeout) => set({ afkTimeout: timeout }),

      teleportToCastle: () => {
        const currentResources = get().resources;
        const teleportCost = Math.floor(currentResources * 0.5);
        set((state) => {
          const newState = {
            worldPosition: { x: 0, y: 0 },
            resources: currentResources - teleportCost
          };
          if (state.user) {
            debouncedSave({ ...state, ...newState });
          }
          return newState;
        });
      },

      buyPickaxe: () => set((state) => {
        if (state.resources >= PICKAXE_COST) {
          const newState = {
            resources: state.resources - PICKAXE_COST,
            inventory: {
              ...state.inventory,
              pickaxes: state.inventory.pickaxes + 1
            }
          };
          if (state.user) {
            debouncedSave({ ...state, ...newState });
          }
          return newState;
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

          set((state) => {
            const newState = {
              inventory: {
                ...state.inventory,
                pickaxes: state.inventory.pickaxes - 1
              }
            };
            if (state.user) {
              debouncedSave({ ...state, ...newState });
            }
            return newState;
          });
        } catch (error) {
          console.error('Error placing structure:', error);
        }
      },

      damageStructure: async (id, damage) => {
        try {
          const structureId = cleanId(id, 'structure');
          const structure = get().structures.find(s => s.id === structureId);
          if (!structure) return;

          const newHealth = Math.max(0, structure.health - damage);

          const { error } = await supabase
            .from('structures')
            .update({ health: newHealth })
            .eq('id', structureId);

          if (error) throw error;
        } catch (error) {
          console.error('Error damaging structure:', error);
        }
      },

      removeStructure: async (id) => {
        try {
          const structureId = cleanId(id, 'structure');
          const { error } = await supabase
            .from('structures')
            .delete()
            .eq('id', structureId);

          if (error) throw error;
        } catch (error) {
          console.error('Error removing structure:', error);
        }
      },

      retrieveStructure: async (id) => {
        try {
          if (get().resources < RETRIEVE_COST) return;

          const structureId = cleanId(id, 'structure');
          const { error } = await supabase
            .from('structures')
            .delete()
            .eq('id', structureId);

          if (error) throw error;

          set((state) => {
            const newState = {
              resources: state.resources - RETRIEVE_COST,
              inventory: {
                ...state.inventory,
                pickaxes: state.inventory.pickaxes + 1
              }
            };
            if (state.user) {
              debouncedSave({ ...state, ...newState });
            }
            return newState;
          });
        } catch (error) {
          console.error('Error retrieving structure:', error);
        }
      },

      updateStructurePosition: async (id, x, y) => {
        try {
          const structureId = cleanId(id, 'structure');
          const { error } = await supabase
            .from('structures')
            .update({
              position_x: x,
              position_y: y
            })
            .eq('id', structureId);

          if (error) throw error;
        } catch (error) {
          console.error('Error updating structure position:', error);
        }
      },

      damageResource: async (id: string, damage: number) => {
        try {
          const resourceId = cleanId(id, 'resource');
          const resource = get().worldResources.find(r => r.id === resourceId);
          
          if (!resource) {
            await get().loadWorldResources();
            return;
          }

          const { data: currentResource, error: fetchError } = await supabase
            .from('resources')
            .select('current_health, value_per_click')
            .eq('id', resourceId)
            .single();

          if (fetchError) {
            console.error('Error fetching resource:', fetchError);
            return;
          }

          const newHealth = Math.max(0, currentResource.current_health - damage);

          if (newHealth <= 0) {
            const { error: deleteError } = await supabase
              .from('resources')
              .delete()
              .eq('id', resourceId);

            if (deleteError) {
              console.error('Error deleting resource:', deleteError);
              return;
            }

            set(state => {
              const newState = {
                resources: state.resources + currentResource.value_per_click
              };
              if (state.user) {
                debouncedSave({ ...state, ...newState });
              }
              return newState;
            });

            await spawnNewResource();
          } else {
            const { error: updateError } = await supabase
              .from('resources')
              .update({ current_health: newHealth })
              .eq('id', resourceId);

            if (updateError) {
              console.error('Error updating resource:', updateError);
              return;
            }

            set(state => {
              const newState = {
                resources: state.resources + currentResource.value_per_click
              };
              if (state.user) {
                debouncedSave({ ...state, ...newState });
              }
              return newState;
            });
          }
        } catch (error) {
          console.error('Error in damageResource:', error);
          await get().loadWorldResources();
        }
      },

      syncStructures: (structures) => {
        const uniqueStructures = Array.from(
          new Map(structures.map(s => [s.id, s])).values()
        );
        set({ structures: uniqueStructures });
      },
      
      syncWorldResources: (resources) => {
        const uniqueResources = Array.from(
          new Map(resources.map(r => [r.id, r])).values()
        );
        set({ worldResources: uniqueResources });
      },

      setUser: (user) => {
        set({ user });
        if (!user) {
          set({
            resources: 0,
            worldPosition: { x: 0, y: 0 },
            progressId: null
          });
        }
      },

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
              resources: latestProgress.resources,
              worldPosition: {
                x: latestProgress.position_x,
                y: latestProgress.position_y
              },
              progressId: latestProgress.id
            });
          } else {
            const { data: newProgress, error: insertError } = await supabase
              .from('user_progress')
              .insert({
                user_id: user.id,
                resources: 0,
                position_x: 0,
                position_y: 0
              })
              .select()
              .single();

            if (insertError) throw insertError;

            if (newProgress) {
              set({ 
                progressId: newProgress.id,
                resources: 0,
                worldPosition: { x: 0, y: 0 }
              });
            }
          }
        } catch (error) {
          console.error('Error loading user progress:', error);
        }
      },

      saveUserProgress: async () => {
        const { user, resources, worldPosition, progressId } = get();
        if (!user) return;

        try {
          const progressData = {
            user_id: user.id,
            resources,
            position_x: worldPosition.x,
            position_y: worldPosition.y,
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
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        username: state.username,
        cursorEmoji: state.cursorEmoji,
        afkTimeout: state.afkTimeout
      })
    }
  )
);

supabase.auth.onAuthStateChange((event, session) => {
  const store = useGameStore.getState();
  
  if (event === 'SIGNED_IN') {
    store.setUser(session?.user ?? null);
    store.loadUserProgress();
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
  }
});

export { useGameStore };