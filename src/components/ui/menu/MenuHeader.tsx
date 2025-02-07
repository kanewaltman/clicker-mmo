import React from 'react';
import { MessageSquareIcon, LogInIcon, LogOutIcon } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useGameStore } from '../../../store/gameStore';
import { signInWithGoogle, signOut } from '../../../lib/auth';
import type { MenuView } from './types';

interface MenuHeaderProps {
  currentView: MenuView;
  onNavigate?: (view: MenuView) => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({ currentView, onNavigate }) => {
  const { user, setUser } = useGameStore();

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
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex justify-between items-center px-6 pb-4">
      <UserProfile onNavigate={onNavigate} />
      {currentView === 'more' ? (
        <button 
          className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors"
          onClick={user ? handleSignOut : handleSignIn}
        >
          <span className="text-white/50 font-semibold">
            {user ? 'Sign Out' : 'Sign In'}
          </span>
          <div className="text-white/50 [&>svg]:fill-white/[0.06]">
            {user ? <LogOutIcon className="w-5 h-5" /> : <LogInIcon className="w-5 h-5" />}
          </div>
        </button>
      ) : (
        <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
          <span className="text-white/50 font-semibold">Chat</span>
          <div className="text-white/50 [&>svg]:fill-white/[0.06]">
            <MessageSquareIcon className="w-5 h-5" />
          </div>
        </button>
      )}
    </div>
  );
};