import React from 'react';
import { MessageSquareIcon, LogOutIcon, LogInIcon } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { signInWithGoogle, signOut } from '../../../lib/auth';
import { useGameStore } from '../../../store/gameStore';
import type { MenuView } from './types';

interface MenuHeaderProps {
  currentView: MenuView;
  onNavigate?: (view: MenuView) => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({ currentView, onNavigate }) => {
  const { user } = useGameStore();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex justify-between items-center px-6 pb-4">
      <UserProfile onNavigate={onNavigate} />
      {currentView === 'main' && (
        <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
          <span className="text-white/50 font-semibold">Chat</span>
          <div className="text-white/50 [&>svg]:fill-white/[0.06]">
            <MessageSquareIcon className="w-5 h-5" />
          </div>
        </button>
      )}
      {currentView === 'more' && (
        user ? (
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <span className="text-white/50 font-semibold">Logout</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <LogOutIcon className="w-5 h-5" />
            </div>
          </button>
        ) : (
          <button 
            onClick={handleSignIn}
            className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <span className="text-white/50 font-semibold">Login</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <LogInIcon className="w-5 h-5" />
            </div>
          </button>
        )
      )}
    </div>
  );
};