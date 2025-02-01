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
- Persistent player settings

#### ⚙️ Settings
- Customizable username
- Cursor style selection
- AFK timeout configuration
- Settings persist between sessions

### 🛠️ Technical Features

#### Real-time Multiplayer Architecture

##### Client-Server Communication
1. **Resource Gathering**
   - Client sends damage request to server
   - Server processes damage and broadcasts changes
   - Resources are only awarded when server confirms the action
   - Prevents client-side manipulation and cheating

2. **Structure Management**
   - Structure placement/updates go through server validation
   - Position updates use optimistic UI with server confirmation
   - Health changes are server-authoritative

3. **Cursor Position Broadcasting**
   - Uses Supabase Realtime channels
   - Throttled updates (50ms interval)
   - Interpolated movement for smooth visuals
   - Automatic AFK detection

##### State Management
1. **Server State**
   - Supabase handles all persistent data
   - Row Level Security (RLS) enforces access control
   - Real-time subscriptions maintain consistency

2. **Client State**
   - Zustand manages local state
   - Persistent settings using localStorage
   - Optimistic updates for responsive UI
   - State reconciliation on server events

##### Security Measures
1. **Resource Collection**
   - Server validates all resource changes
   - Resources awarded only on server confirmation
   - Prevents client-side point manipulation
   - Rate limiting on server actions

2. **Structure Ownership**
   - RLS policies enforce ownership rules
   - Only owners can modify structures
   - Public read access for all players

3. **Anti-Cheat**
   - Server-side validation for all actions
   - No client-side resource calculations
   - Position validation for structure placement
   - Rate limiting on critical actions

##### Real-time Updates
1. **Supabase Channels**
   - Broadcast changes to all connected clients
   - Handle cursor position updates
   - Manage resource state changes
   - Sync structure modifications

2. **State Synchronization**
   - Immediate local updates for responsiveness
   - Server confirmation for state changes
   - Automatic conflict resolution
   - Graceful error handling

3. **Performance Optimizations**
   - Throttled position updates
   - Batched state updates
   - Efficient change detection
   - Minimal network payload

### 🚀 Deployment

The game is successfully deployed on Netlify. Here are the key deployment details and solutions to common issues:

#### Database Setup
1. **User Progress Table**
   - Unique constraint on user_id field
   - Automatic creation of new progress records
   - Proper error handling for concurrent updates

#### Authentication Flow
1. **Sign In Process**
   - Google OAuth integration
   - Automatic user progress creation
   - Session persistence

#### Common Issues & Solutions

1. **User Progress Conflicts**
   ```sql
   -- Solution: Add unique constraint on user_id
   ALTER TABLE user_progress 
   ADD CONSTRAINT user_progress_user_id_key 
   UNIQUE (user_id);
   ```

2. **Progress Loading Errors**
   - Added `.throwOnError()` to Supabase queries
   - Proper error handling for non-existent records
   - Automatic progress creation for new users

3. **Progress Saving Issues**
   - Removed `onConflict` specification
   - Using `upsert` with proper constraints
   - Debounced save operations

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