import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { MenuView } from '../types';

interface UserProfileProps {
  onNavigate?: (view: MenuView) => void;
  isDesktop?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onNavigate, isDesktop }) => {
  const { username, resources, cursorEmoji } = useGameStore();
  
  return (
    <button 
      onClick={() => onNavigate?.('more')}
      className="flex gap-2 items-center self-stretch font-semibold whitespace-nowrap hover:bg-white/5 active:bg-white/10 transition-colors rounded-xl px-2 pr-4 -mx-2"
    >
      <div className="text-2xl">{cursorEmoji}</div>
      <div className="flex flex-col justify-center py-1 min-w-0 text-left">
        <div className="text-lg tracking-normal text-white truncate">{username}</div>
        <div className="text-xs tracking-normal text-amber-300 truncate">{resources} 💰</div>
      </div>
    </button>
  );
};