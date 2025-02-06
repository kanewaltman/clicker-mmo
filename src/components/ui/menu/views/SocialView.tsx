import React from 'react';
import { useGameStore } from '../../../../store/gameStore';

interface SocialViewProps {
  onBack: () => void;
}

export const SocialView: React.FC<SocialViewProps> = ({ onBack }) => {
  const { user } = useGameStore();

  return (
    <div className="px-4 pb-16 social-view-content">
      <div className="space-y-4">
        <div className="bg-white/[0.03] rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-2">Your Profile</h3>
          {user ? (
            <div className="flex items-center gap-4">
              <img 
                src={user.user_metadata.avatar_url} 
                alt={user.user_metadata.full_name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="text-white">{user.user_metadata.full_name}</div>
                <div className="text-gray-400 text-sm">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Sign in to view your profile</div>
          )}
        </div>

        <div className="bg-white/[0.03] rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-2">Friends</h3>
          <div className="text-gray-400">Coming soon!</div>
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