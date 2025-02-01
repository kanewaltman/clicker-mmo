import React from 'react';

interface PlayerCursorProps {
  x: number;
  y: number;
  emoji: string;
  username: string;
  resources: number;
  isOwnCursor?: boolean;
  isAFK?: boolean;
}

export const PlayerCursor: React.FC<PlayerCursorProps> = ({
  x,
  y,
  emoji,
  username,
  resources,
  isOwnCursor = false,
  isAFK = false
}) => {
  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left: x,
        top: isOwnCursor ? y : y - 50, // Offset other players' cursors by 50px
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col items-center">
        <span className="text-2xl select-none">{emoji}</span>
        <div className="flex items-center gap-2 mt-1 absolute top-[100%]">
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded whitespace-nowrap">
            {username}{isAFK ? ' 💤' : ''}
          </span>
          <span className="text-xs text-yellow-400 bg-black/50 px-2 py-1 rounded whitespace-nowrap">
            💰 {resources}
          </span>
        </div>
      </div>
    </div>
  );
};