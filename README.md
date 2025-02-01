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

#### Real-time Multiplayer
- Cursor position broadcasting
- Structure state synchronization
- Resource state synchronization
- AFK detection system

#### Database Integration
- Supabase real-time subscriptions
- Row Level Security (RLS) policies
- Structured database schema
- Optimistic updates for better UX

#### Performance
- Efficient state management with Zustand
- Optimized rendering with React
- Debounced network updates
- Interpolated cursor movement

### 🎯 Game Mechanics

#### Resource Gathering
1. Click on resources to gather them
2. Each resource type has different:
   - Health points
   - Value per click
   - Rarity (affects spawn rate)
   - Visual appearance

#### Structure Management
1. Purchase pickaxes from the shop (100 resources)
2. Place structures in the world
3. Structures automatically gather resources
4. Protect your structures from other players
5. Drag structures to reposition them

#### Economy
- Resources are the main currency
- Structures cost 100 resources
- Teleporting costs 50% of current resources
- Structure retrieval costs 50 resources

### 🎨 Visual Elements
- Rarity-based color coding
- Health bars for resources and structures
- Animated pickaxes
- Custom cursor emojis
- Resource tooltips
- Player labels with resource counts

### 🔒 Security Features
- Row Level Security for database access
- Structure ownership verification
- Anti-cheat measures for resource gathering
- Protected structure manipulation

### 🎛️ Controls
- WASD: Move around the world
- Left Click: Gather resources/Damage structures
- Right Click: Structure context menu
- Drag: Move structures (if owned)
- ESC: Close modals

## 🚀 Future Possibilities
- Additional resource types
- More structure varieties
- Player achievements
- Trading system
- Clan/Guild system
- PvP zones
- Resource processing/crafting
- Player skills/progression
- Daily quests/missions
- Special events

## 🔧 Technical Stack
- React + Vite
- TypeScript
- Tailwind CSS
- Supabase (Real-time Database)
- Zustand (State Management)
- Lucide React (Icons)

## 🎯 Design Goals
1. Engaging multiplayer interaction
2. Simple but deep gameplay mechanics
3. Fair and balanced progression
4. Smooth real-time updates
5. Persistent world state
6. Cross-browser compatibility
7. Mobile-friendly interface

This document serves as both documentation and a game design document (GDD) for future development.