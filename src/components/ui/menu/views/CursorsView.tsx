import React from 'react';
import { useGameStore } from '../../../../store/gameStore';

const CURSOR_OPTIONS = ['👆', '👇', '👈', '👉', '🖐️', '✌️', '👊', '🫵', '☝️', '🫰'];

interface CursorsViewProps {
  onBack: () => void;
}

export const CursorsView: React.FC<CursorsViewProps> = ({ onBack }) => {
  const { cursorEmoji, setCursorEmoji } = useGameStore();

  return (
    <div className="px-4 pb-16 cursors-view-content">
      <div className="grid grid-cols-5 gap-2">
        {CURSOR_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setCursorEmoji(emoji)}
            className={`aspect-square text-2xl bg-white/[0.03] rounded-2xl hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors flex items-center justify-center ${
              cursorEmoji === emoji ? 'bg-blue-500/20 text-blue-300' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold mt-6"
      >
        Back
      </button>
    </div>
  );
};