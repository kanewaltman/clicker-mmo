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

### 🔒 Resource Gathering System

The game implements a robust resource gathering system with the following features:

1. **Resource Claiming**
   - Resources must be claimed before gathering
   - Only one player can gather a resource at a time
   - Claims automatically expire after 5 seconds
   - Prevents multiple players from gathering the same resource

2. **Gathering Logic**
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

3. **Database Schema**
   ```sql
   -- Resources table with gathering system
   CREATE TABLE resources (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     type text NOT NULL,
     rarity text NOT NULL,
     current_health int NOT NULL,
     max_health int NOT NULL,
     value_per_click int NOT NULL,
     gatherer_id uuid REFERENCES auth.users(id),
     updated_at timestamptz DEFAULT now()
   );

   -- Automatically release stale claims
   CREATE FUNCTION release_stale_claims()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE resources
     SET gatherer_id = NULL
     WHERE gatherer_id IS NOT NULL
     AND updated_at < NOW() - INTERVAL '5 seconds';
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Trigger to clean up stale claims
   CREATE TRIGGER auto_release_claims
     AFTER UPDATE ON resources
     FOR EACH STATEMENT
     EXECUTE FUNCTION release_stale_claims();
   ```

4. **Row Level Security**
   ```sql
   -- Resource access policies
   CREATE POLICY "Anyone can read resources"
     ON resources FOR SELECT
     TO public USING (true);

   CREATE POLICY "Users can claim and update resources"
     ON resources FOR UPDATE
     TO authenticated
     USING (
       gatherer_id IS NULL OR 
       gatherer_id = auth.uid()
     )
     WITH CHECK (
       (gatherer_id IS NULL AND NEW.gatherer_id = auth.uid()) OR
       (gatherer_id = auth.uid() AND NEW.gatherer_id = auth.uid()) OR
       (gatherer_id = auth.uid() AND NEW.gatherer_id IS NULL)
     );
   ```

### 🔐 Progress Persistence

The game implements robust progress persistence with the following features:

1. **State Management**
   - Automatic saving of player position
   - Resource count persistence
   - Debounced save operations to prevent API spam
   - Proper error handling and recovery

2. **Data Synchronization**
   - Real-time position updates
   - Resource count synchronization
   - Automatic state recovery on page refresh
   - Conflict resolution for concurrent updates

3. **Technical Implementation**
   ```typescript
   // Example of state persistence with proper error handling
   const saveProgress = async () => {
     try {
       await supabase
         .from('user_progress')
         .upsert({
           user_id: userId,
           resources: currentResources,
           position_x: worldPosition.x,
           position_y: worldPosition.y
         })
         .throwOnError();
     } catch (error) {
       console.error('Error saving progress:', error);
     }
   };
   ```

### 🚀 Deployment

The game is deployed on Netlify with the following configuration:

1. **Build Settings**
   - Framework: Vite
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Node Version: 18.x

2. **Environment Variables**
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

3. **Database Configuration**
   - Supabase real-time subscriptions
   - Row Level Security (RLS) policies
   - Structured database schema
   - Optimistic updates for better UX

### 🔧 Technical Stack
- React + Vite
- TypeScript
- Tailwind CSS
- Supabase (Real-time Database)
- Zustand (State Management)
- Lucide React (Icons)

### 🎯 Design Goals
1. Engaging multiplayer interaction
2. Simple but deep gameplay mechanics
3. Fair and balanced progression
4. Smooth real-time updates
5. Persistent world state
6. Cross-browser compatibility
7. Mobile-friendly interface

This document serves as both documentation and a game design document (GDD) for future development.