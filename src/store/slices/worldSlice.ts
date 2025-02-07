import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { getRandomSpawnPosition, selectRandomResource } from '../../config/lootTable';
import { balanceResources } from '../utils/resourceBalance';

export interface WorldPosition {
  x: number;
  y: number;
}

export interface WorldState {
  worldPosition: WorldPosition;
  resources: number;
  worldResources: WorldResource[];
  setWorldPosition: (x: number, y: number) => void;
  addResources: (amount: number) => void;
  loadWorldResources: () => Promise<void>;
  damageResource: (id: string, damage: number) => Promise<void>;
  syncWorldResources: (resources: WorldResource[]) => void;
  teleportToCastle: () => void;
}

export interface WorldResource {
  id: string;
  type: 'wood' | 'stone' | 'iron' | 'diamond';
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  position: WorldPosition;
  maxHealth: number;
  currentHealth: number;
  valuePerClick: number;
  emoji: string;
  created_at?: string;
}

const cleanId = (id: string, prefix: string) => id.replace(`${prefix}-`, '');

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
  emoji: dbResource.emoji,
  created_at: dbResource.created_at
});

export const createWorldSlice: StateCreator<WorldState> = (set, get) => ({
  worldPosition: { x: 0, y: 0 },
  resources: 0,
  worldResources: [],

  setWorldPosition: (x, y) => {
    set({ worldPosition: { x, y } });
    // Save position to user progress
    const store = get() as any;
    if (store.user) {
      store.saveUserProgress();
    }
  },
  
  addResources: (amount) => {
    set((state) => ({ resources: state.resources + amount }));
    // Save resources to user progress
    const store = get() as any;
    if (store.user) {
      store.saveUserProgress();
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
      await balanceResources(get().worldResources);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  },

  damageResource: async (id: string, damage: number) => {
    try {
      const resourceId = cleanId(id, 'resource');
      const resource = get().worldResources.find(r => r.id === resourceId);
      
      if (!resource) {
        console.log('Resource not found, refreshing resources...');
        await get().loadWorldResources();
        return;
      }

      const { data: currentResource, error: fetchError } = await supabase
        .from('resources')
        .select('current_health, value_per_click')
        .eq('id', resourceId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching resource:', fetchError);
        return;
      }

      if (!currentResource) {
        console.log('Resource no longer exists, refreshing resources...');
        await get().loadWorldResources();
        return;
      }

      const oldHealth = currentResource.current_health;
      const newHealth = Math.max(0, oldHealth - damage);

      if (newHealth <= 0) {
        const { data: deletedResource, error: deleteError } = await supabase
          .from('resources')
          .delete()
          .eq('id', resourceId)
          .eq('current_health', oldHealth)
          .select()
          .single();

        if (deleteError) {
          console.error('Error deleting resource:', deleteError);
          return;
        }

        if (deletedResource) {
          set(state => ({
            resources: state.resources + currentResource.value_per_click
          }));

          // Save progress after collecting resources
          const store = get() as any;
          if (store.user) {
            store.saveUserProgress();
          }

          // Spawn new resource
          const position = getRandomSpawnPosition(get().worldResources);
          const resourceConfig = selectRandomResource();
          
          await supabase
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
            });
        }
      } else {
        const { data: updatedResource, error: updateError } = await supabase
          .from('resources')
          .update({ current_health: newHealth })
          .eq('id', resourceId)
          .eq('current_health', oldHealth)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating resource:', updateError);
          return;
        }

        if (updatedResource && updatedResource.current_health < oldHealth) {
          set(state => ({
            resources: state.resources + currentResource.value_per_click
          }));

          // Save progress after collecting resources
          const store = get() as any;
          if (store.user) {
            store.saveUserProgress();
          }
        }
      }
    } catch (error) {
      console.error('Error in damageResource:', error);
      await get().loadWorldResources();
    }
  },

  syncWorldResources: (resources) => {
    const uniqueResources = Array.from(
      new Map(resources.map(r => [r.id, r])).values()
    );
    set({ worldResources: uniqueResources });
  },

  teleportToCastle: () => {
    // Calculate the center position by using positive half of viewport dimensions
    // This moves the world in the opposite direction to center the castle
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    set({ worldPosition: { x: centerX, y: centerY } });
    
    // Save position after teleporting
    const store = get() as any;
    if (store.user) {
      store.saveUserProgress();
    }
  }
});