import React from 'react';
import { MessageSquareIcon } from 'lucide-react';
import { UserProfile } from './UserProfile';
import type { MenuView } from './types';

interface MenuHeaderProps {
  currentView: MenuView;
  onNavigate?: (view: MenuView) => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
  user: any;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({ 
  currentView, 
  onNavigate,
  onSignIn,
  onSignOut,
  user
}) => {
  return (
    <div className="flex justify-between items-center px-6 pb-4">
      <UserProfile 
        onNavigate={onNavigate} 
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        user={user}
      />
      {currentView === 'main' && (
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