import React from 'react';

interface Player {
  id: string;
  username: string;
  points: number;
  lastUpdate: number;
}

interface LeaderboardProps {
  position: { x: number; y: number };
  players: Player[];
  currentUserId: string;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  position,
  players,
  currentUserId,
  onMouseDown
}) => {
  return (
    <div 
      className="fixed z-10 bg-gray-800/90 p-4 rounded-lg backdrop-blur-sm shadow-lg cursor-move"
      style={{
        left: position.x,
        top: position.y,
        minWidth: '250px'
      }}
      onMouseDown={onMouseDown}
    >
      <h3 className="text-white font-bold mb-2 text-sm select-none">Top Players</h3>
      <div className="space-y-2">
        {players.map((player, index) => (
          <div 
            key={player.id} 
            className={`flex items-center gap-2 text-sm select-none ${
              player.id === `local-${currentUserId}` ? 'bg-blue-500/20 px-2 py-1 rounded -mx-2' : ''
            }`}
          >
            <span className="text-yellow-400 w-4">{index + 1}.</span>
            <span className="text-white">{player.username}</span>
            <span className="text-yellow-400">💰 {player.points}</span>
          </div>
        ))}
        {players.length === 0 && (
          <div className="text-gray-400 text-sm">No active players</div>
        )}
      </div>
    </div>
  );
};