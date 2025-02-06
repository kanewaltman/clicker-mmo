import React from 'react';
import { useGameStore } from '../../../store/gameStore';

export const UserProfile: React.FC = () => {
  const { username, resources, cursorEmoji } = useGameStore();
  
  return (
    <div className="flex gap-2 items-center self-stretch font-semibold whitespace-nowrap">
      <div className="text-2xl">{cursorEmoji}</div>
      <div className="flex flex-col justify-center py-1">
        <div className="text-lg tracking-normal text-white">{username}</div>
        <div className="text-xs tracking-normal text-amber-300">💰 {resources}</div>
      </div>
    </div>
  );
};