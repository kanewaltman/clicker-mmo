# Cursor Clicker MMO

A real-time multiplayer resource gathering game where players collaborate and compete in a shared world.

## 🎮 Game Overview

Cursor Clicker MMO is a multiplayer online game where players gather resources, build structures, and interact in a shared persistent world. Players can see each other's cursors in real-time, collect resources, and build automated gathering structures.

### Core Features

#### 🌍 Shared World
- Real-time multiplayer interaction
- See other players' cursors and actions
- Persistent world state using Supabase
- Player movement using WASD keys
- Customizable cursor emojis

#### 💰 Resource System
- Multiple resource types with varying rarity:
  - 🌳 Wood (Common)
  - ⛰️ Stone (Uncommon)
  - ⚒️ Iron (Rare)
  - 💎 Diamond (Legendary)
- Resources have:
  - Health points
  - Value per click
  - Rarity-based visual effects
  - Auto-respawning system

#### 🏰 Town Center
- Central hub area
- Shop for purchasing upgrades
- Teleport back to center (costs 50% of current resources)
- Safe zone indicated by yellow border

#### ⚒️ Structures
- Automated resource gathering
- Placeable pickaxes that gather resources over time
- Structure health system
- Ability to damage other players' structures
- Drag-and-drop structure positioning

#### 📊 Player Progress
- Resource counter
- Draggable leaderboard showing top players
- Inventory system for structures
- Persistent player settings and progress

### 🎯 Interaction Systems

The game implements sophisticated interaction systems for both desktop and mobile devices, ensuring smooth gameplay across all platforms.

#### 🖥️ Desktop Controls
1. **Mouse Movement**
   - Smooth cursor tracking with requestAnimationFrame
   - Performance-optimized position updates (~60fps)
   - Cursor position syncing across all players
   - Optional cursor hiding during panning

2. **Keyboard Controls**
   - WASD keys for camera movement
   - Configurable movement speed
   - Responsive input handling

3. **Resource Gathering**
   - Click-to-gather mechanics
   - Visual feedback on resource hits
   - Automatic claim system with 5-second timeout
   - Concurrent gathering prevention
   - Smart animation system:
     - Tracks local vs remote gathering actions
     - Prevents double animations on health updates
     - Uses health prediction for smoother feedback
     - Separate handling for player clicks and network updates

4. **Structure Management**
   - Drag-and-drop structure placement
   - Click-and-hold to move existing structures
   - Structure damage system with visual feedback

#### 📱 Mobile Controls
1. **Touch Handling**
   - Center-locked cursor for consistent interaction
   - Optimized touch event processing
   - Prevent unwanted browser behaviors:
     - No zooming
     - No pull-to-refresh
     - No text selection
     - No context menus

2. **Gesture Recognition**
   - Short tap (< 200ms) for resource gathering
   - Pan gesture for camera movement
   - Minimal movement threshold (10px) to distinguish taps from pans
   - Multi-touch prevention for consistent interaction

3. **Mobile Optimizations**
   - Fixed cursor position at screen center
   - Touch-to-click conversion for resource gathering
   - Automatic viewport management
   - Touch event debouncing

4. **Performance Features**
   - RAF-based animation system
   - Touch event throttling
   - Efficient state updates
   - Memory leak prevention
   - Cleanup on component unmount

#### 🔄 Shared Systems
1. **State Management**
   - Centralized game state using Zustand
   - Modular store architecture:
     - `userSlice`: User settings, preferences, and progress
     - `worldSlice`: World position, resources, and resource management
     - `structureSlice`: Structure placement, management, and inventory
   - Real-time multiplayer synchronization
   - Optimistic updates for responsiveness
   - Automatic state recovery

2. **Performance Optimizations**
   - requestAnimationFrame for smooth animations
   - Event throttling and debouncing
   - Memoized calculations
   - Efficient re-rendering

3. **Error Prevention**
   - Initialization guards
   - Event cleanup
   - Memory management
   - Error boundaries

4. **Accessibility**
   - Platform-specific controls
   - Visual feedback
   - Responsive design
   - Cross-device compatibility

### 🔒 Resource Gathering System

The game implements a robust resource gathering system with the following features:

1. **Resource Claiming**
   - Resources must be claimed before gathering
   - Only one player can gather a resource at a time
   - Claims automatically expire after 5 seconds
   - Prevents multiple players from gathering the same resource

2. **Animation System**
   ```typescript
   // Resource animation with smart health tracking
   const ResourceNode: React.FC<ResourceNodeProps> = ({ resource, onResourceClick }) => {
     const [isHarvesting, setIsHarvesting] = useState(false);
     const lastHealthRef = useRef(resource.currentHealth);
     const lastClickTimeRef = useRef(0);
     const lastClickHealthRef = useRef(resource.currentHealth);

     // Trigger animation with cleanup
     const triggerHarvestAnimation = useCallback(() => {
       setIsHarvesting(true);
       setTimeout(() => setIsHarvesting(false), 200);
     }, []);

     // Smart health change detection
     useEffect(() => {
       // Skip if this is our own click
       if (resource.currentHealth === lastClickHealthRef.current) return;

       const now = Date.now();
       // Only animate if:
       // 1. Health decreased
       // 2. Not our recent click
       // 3. Different from last click
       if (resource.currentHealth < lastHealthRef.current && 
           now - lastClickTimeRef.current > 500) {
         triggerHarvestAnimation();
       }
       lastHealthRef.current = resource.currentHealth;
     }, [resource.currentHealth]);

     // Click handling with health prediction
     const handleClick = () => {
       lastClickTimeRef.current = Date.now();
       lastClickHealthRef.current = resource.currentHealth - 10;
       onResourceClick(resource);
       triggerHarvestAnimation();
     };
   };
   ```

3. **Gathering Logic**
   ```typescript
   // Resource gathering with claim system
   const damageResource = async (resourceId: string, damage: number) => {
     try {
       // Check if resource is available
       const { data: resource } = await supabase
         .from('resources')
         .select('current_health, gatherer_id')
         .eq('id', resourceId)
         .single();

       // Only proceed if unclaimed or claimed by this user
       if (resource.gatherer_id && resource.gatherer_id !== userId) {
         return;
       }

       // Try to claim the resource
       await supabase
         .from('resources')
         .update({ 
           gatherer_id: userId,
           updated_at: new Date()
         })
         .eq('id', resourceId)
         .is('gatherer_id', null);

       // Update resource health
       const newHealth = Math.max(0, resource.current_health - damage);
       await supabase
         .from('resources')
         .update({ current_health: newHealth })
         .eq('id', resourceId)
         .eq('gatherer_id', userId);

       // Release claim after gathering
       await supabase
         .from('resources')
         .update({ gatherer_id: null })
         .eq('id', resourceId)
         .eq('gatherer_id', userId);
     } catch (error) {
       console.error('Error gathering resource:', error);
     }
   };
   ```

### 🎮 Realtime Cursor Synchronization

The game features a sophisticated cursor synchronization system that enables players to see each other's movements in real-time:

1. **Broadcast System**
   - Optimized cursor position updates using throttling (50ms intervals)
   - Efficient payload structure to minimize network traffic
   - Automatic cleanup of disconnected cursors

2. **Interpolation**
   - Smooth cursor movement using linear interpolation
   - 60fps animation using requestAnimationFrame
   - Configurable interpolation speed for different network conditions

3. **State Management**
   ```typescript
   // Cursor state interface
   interface CursorWithInterpolation {
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
   ```

4. **Channel Management**
   - Automatic channel subscription and cleanup
   - Error handling for network issues
   - Memory leak prevention
   - Proper cleanup on component unmount

5. **Performance Features**
   - Efficient cursor filtering (remove inactive after 30s)
   - Optimized state updates using React's batch updates
   - Minimal re-renders through proper dependency management
   - Automatic AFK detection and status broadcasting

6. **Implementation Details**
   - Uses Supabase Realtime channels for WebSocket communication
   - Implements broadcast pattern to minimize server load
   - Handles edge cases like self-cursor filtering
   - Maintains smooth animations even under network latency

### 🐞 Debug Mode

The game includes a comprehensive debug mode that can be accessed by pressing `F3` or using the debug button on mobile devices. This mode provides valuable insights into the game's resource spawning system and world boundaries.

#### Features

1. **Visual Indicators**
   - World bounds (blue border)
   - Spawn radius (green circle)
   - No-spawn zone around castle (red circle)
   - Cluster range visualization (yellow circle)
   - Density grid overlay

2. **Spawn Area Configuration**
   - World Bounds: ±500px from center
   - Spawn Radius: 450px
   - No-Spawn Zone: 200px around castle
   - Grid Size: 100px for density calculations

3. **Resource Spacing**
   - Minimum distance between resources: 50px
   - Cluster minimum spacing: 80px
   - Cluster radius: 120px

4. **Cluster Settings**
   - Spawn chance: 30%
   - Maximum cluster size: 5 resources
   - Type consistency within clusters

5. **Debug Controls**
   - Force spawn cluster button
   - Real-time visualization updates
   - Detailed spawn area metrics

#### Implementation Details

1. **Resource Placement**
   - Smart positioning algorithm
   - Density-based spawn distribution
   - Cluster formation logic
   - Collision prevention

2. **Visual Debugging**
   - Real-time overlay rendering
   - Grid-based density visualization
   - Interactive spawn testing
   - Clear visual feedback

3. **Debug Interface**
   ```typescript
   interface SpawnDebugProps {
     worldPosition: { x: number; y: number };
   }
   ```

4. **Configuration Constants**
   ```typescript
   const SPAWN_AREA = {
     minX: -500,
     maxX: 500,
     minY: -500,
     maxY: 500,
     minDistanceFromCenter: 200,
     gridSize: 100,
     maxAttemptsPerSpawn: 15,
     minSpacing: 50,
     clusterChance: 0.3,
     clusterRadius: 120,
     clusterMinSpacing: 80,
     maxClusterSize: 5,
     spawnRadius: 450
   };
   ```

The debug mode provides essential tools for understanding and testing the game's resource spawning mechanics, making it invaluable for development and testing.

### 🚀 Performance Optimizations

The game implements sophisticated performance optimizations to handle large numbers of resources efficiently:

1. **Spatial Partitioning**
   - World divided into 500x500 pixel grid cells
   - Resources and structures organized by grid location
   - Efficient querying of visible entities
   - Automatic grid management and cleanup

2. **Viewport Culling**
   - Only renders entities visible in the viewport
   - 200px padding to prevent pop-in effects
   - Efficient screen coordinate calculations
   - Smooth transitions during movement

3. **Memory Management**
   ```typescript
   interface SpatialGrid {
     resources: Map<string, WorldResource[]>;
     structures: Map<string, Structure[]>;
   }
   ```
   - Efficient grid-based entity storage
   - Automatic cleanup of out-of-view entities
   - Memory-efficient data structures
   - Optimized collection management

4. **Rendering Optimizations**
   - React component memoization
   - Efficient state updates
   - Batched rendering updates
   - Smart re-render prevention

5. **Mobile-Specific Optimizations**
   - Reduced animation complexity
   - Touch event optimization
   - Efficient gesture handling
   - Viewport-based rendering