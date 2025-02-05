import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { WorldPosition } from './worldSlice';

export interface Structure {
  id: string;
  type: 'pickaxe';
  position: WorldPosition;
  owner: string;
  health: number;
  lastGather: number;
}

export interface StructureState {
  structures: Structure[];
  inventory: Inventory;
  placeStructure: (structure: Omit<Structure, 'id' | 'health'>) => void;
  damageStructure: (id: string, damage: number) => void;
  removeStructure: (id: string) => void;
  retrieveStructure: (id: string) => void;
  updateStructurePosition: (id: string, x: number, y: number) => void;
  syncStructures: (structures: Structure[]) => void;
  loadStructures: () => Promise<void>;
  buyPickaxe: () => void;
}

interface Inventory {
  pickaxes: number;
}

const PICKAXE_COST = 100;
const STRUCTURE_MAX_HEALTH = 1000;
const RETRIEVE_COST = 50;

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

export const createStructureSlice: StateCreator<StructureState> = (set, get) => ({
  structures: [],
  inventory: {
    pickaxes: 0
  },

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

      set((state) => ({
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
      const structureId = cleanId(id, 'structure');
      const { error } = await supabase
        .from('structures')
        .delete()
        .eq('id', structureId);

      if (error) throw error;

      set((state) => ({
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

  syncStructures: (structures) => {
    const uniqueStructures = Array.from(
      new Map(structures.map(s => [s.id, s])).values()
    );
    set({ structures: uniqueStructures });
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
  })
});