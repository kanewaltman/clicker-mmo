import { useMemo } from 'react';
import type { WorldResource, Structure } from '../../../store/gameStore';
import type { WorldPosition } from '../../../store/slices/worldSlice';

const GRID_SIZE = 500; // Size of each grid cell

interface SpatialGrid {
  resources: Map<string, WorldResource[]>;
  structures: Map<string, Structure[]>;
}

function getGridKey(x: number, y: number): string {
  const gridX = Math.floor(x / GRID_SIZE);
  const gridY = Math.floor(y / GRID_SIZE);
  return `${gridX},${gridY}`;
}

function getRelevantGridKeys(worldPosition: WorldPosition): string[] {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate grid cells that cover the viewport
  const startX = Math.floor(((-worldPosition.x - GRID_SIZE) / GRID_SIZE));
  const startY = Math.floor(((-worldPosition.y - GRID_SIZE) / GRID_SIZE));
  const endX = Math.floor(((viewportWidth - worldPosition.x + GRID_SIZE) / GRID_SIZE));
  const endY = Math.floor(((viewportHeight - worldPosition.y + GRID_SIZE) / GRID_SIZE));
  
  const keys: string[] = [];
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      keys.push(`${x},${y}`);
    }
  }
  return keys;
}

export function useSpatialPartitioning(
  resources: WorldResource[],
  structures: Structure[],
  worldPosition: WorldPosition
) {
  // Create spatial grid
  const grid = useMemo<SpatialGrid>(() => {
    const resourceGrid = new Map<string, WorldResource[]>();
    const structureGrid = new Map<string, Structure[]>();

    // Partition resources
    resources.forEach(resource => {
      const key = getGridKey(resource.position.x, resource.position.y);
      if (!resourceGrid.has(key)) {
        resourceGrid.set(key, []);
      }
      resourceGrid.get(key)!.push(resource);
    });

    // Partition structures
    structures.forEach(structure => {
      const key = getGridKey(structure.position.x, structure.position.y);
      if (!structureGrid.has(key)) {
        structureGrid.set(key, []);
      }
      structureGrid.get(key)!.push(structure);
    });

    return { resources: resourceGrid, structures: structureGrid };
  }, [resources, structures]);

  // Get visible entities
  const visibleEntities = useMemo(() => {
    const gridKeys = getRelevantGridKeys(worldPosition);
    
    const visibleResources: WorldResource[] = [];
    const visibleStructures: Structure[] = [];

    gridKeys.forEach(key => {
      if (grid.resources.has(key)) {
        visibleResources.push(...grid.resources.get(key)!);
      }
      if (grid.structures.has(key)) {
        visibleStructures.push(...grid.structures.get(key)!);
      }
    });

    return { visibleResources, visibleStructures };
  }, [grid, worldPosition]);

  return visibleEntities;
}