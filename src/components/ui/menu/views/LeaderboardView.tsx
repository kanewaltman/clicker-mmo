import React from 'react';
import { useGameStore } from '../../../../store/gameStore';

interface LeaderboardViewProps {
  onBack: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  return (
    <div className="px-4 pb-16 leaderboard-view-content">
      <div className="space-y-4">
        <div className="bg-white/[0.03] rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4">Top Players</h3>
          <div className="space-y-2">
            {/* Placeholder for leaderboard entries */}
            <div className="text-gray-400">Loading leaderboard...</div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold"
        >
          Back
        </button>
      </div>
    </div>
  );
};