import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface GameState {
  worldPosition: { x: number; y: number };
  resources: number;
  camps: Camp[];
  username: string;
  cursorEmoji: string;
  inventory: Inventory;
  structures: Structure[];
  afkTimeout: number;
  setWorldPosition: (x: number, y: number) => void;
  addResources: (amount: number) => void;
  addCamp: (camp: Camp) => void;
  setUsername: (name: string) => void;
  setCursorEmoji: (emoji: string) => void;
  setAfkTimeout: (timeout: number) => void;
  buyPickaxe: () => void;
  placeStructure: (structure: Omit<Structure, 'id' | 'health'>) => void;
  damageStructure: (id: string, damage: number) => void;
  removeStructure: (id: string) => void;
  retrieveStructure: (id: string) => void;
  updateStructurePosition: (id: string, x: number, y: number) => void;
  syncStructures: (structures: Structure[]) => void;
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

const PICKAXE_COST = 100;
const STRUCTURE_MAX_HEALTH = 1000;
const RETRIEVE_COST = 50; // Cost to retrieve a structure
const DEFAULT_AFK_TIMEOUT = 5000;

const generateUniqueId = () => {
  return crypto.randomUUID();
};

const broadcastStructureChange = async (structures: Structure[]) => {
  try {
    await supabase.channel('structures').send({
      type: 'broadcast',
      event: 'structure_update',
      payload: { structures }
    });
  } catch (error) {
    console.error('Error broadcasting structure change:', error);
  }
};

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
      afkTimeout: DEFAULT_AFK_TIMEOUT,
      setWorldPosition: (x, y) => set({ worldPosition: { x, y } }),
      addResources: (amount) => set((state) => ({ resources: state.resources + amount })),
      addCamp: (camp) => set((state) => ({ camps: [...state.camps, camp] })),
      setUsername: (name) => set({ username: name }),
      setCursorEmoji: (emoji) => set({ cursorEmoji: emoji }),
      setAfkTimeout: (timeout) => set({ afkTimeout: timeout }),
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
      placeStructure: (structure) => {
        const newStructure = {
          ...structure,
          id: generateUniqueId(),
          health: STRUCTURE_MAX_HEALTH
        };

        set((state) => {
          const newStructures = [...state.structures, newStructure];
          broadcastStructureChange(newStructures);
          return {
            structures: newStructures,
            inventory: {
              ...state.inventory,
              pickaxes: state.inventory.pickaxes - 1
            }
          };
        });
      },
      damageStructure: (id, damage) => set((state) => {
        const newStructures = state.structures.map(structure => 
          structure.id === id 
            ? { ...structure, health: Math.max(0, structure.health - damage) }
            : structure
        );
        broadcastStructureChange(newStructures);
        return { structures: newStructures };
      }),
      removeStructure: (id) => set((state) => {
        const newStructures = state.structures.filter(structure => structure.id !== id);
        broadcastStructureChange(newStructures);
        return { structures: newStructures };
      }),
      retrieveStructure: (id) => set((state) => {
        if (state.resources < RETRIEVE_COST) return state;

        const structure = state.structures.find(s => s.id === id);
        if (!structure) return state;

        const newStructures = state.structures.filter(s => s.id !== id);
        broadcastStructureChange(newStructures);

        return {
          structures: newStructures,
          resources: state.resources - RETRIEVE_COST,
          inventory: {
            ...state.inventory,
            pickaxes: state.inventory.pickaxes + 1
          }
        };
      }),
      updateStructurePosition: (id, x, y) => set((state) => {
        const newStructures = state.structures.map(structure =>
          structure.id === id
            ? { ...structure, position: { x, y } }
            : structure
        );
        broadcastStructureChange(newStructures);
        return { structures: newStructures };
      }),
      syncStructures: (structures) => set({ structures })
    }),
    {
      name: 'game-storage',
    }
  )
);