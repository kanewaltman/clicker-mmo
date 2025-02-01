import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { signInWithGoogle, signOut } from '../lib/auth';
import { useGameStore } from '../store/gameStore';

export const AuthButton: React.FC = () => {
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
    <button
      onClick={user ? handleSignOut : handleSignIn}
      className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors flex items-center gap-2"
    >
      {user ? (
        <>
          <img 
            src={user.user_metadata.avatar_url} 
            alt={user.user_metadata.full_name}
            className="w-6 h-6 rounded-full"
          />
          <LogOut className="text-white" size={20} />
        </>
      ) : (
        <>
          <LogIn className="text-white" size={20} />
          <span className="text-white text-sm">Sign In</span>
        </>
      )}
    </button>
  );
};