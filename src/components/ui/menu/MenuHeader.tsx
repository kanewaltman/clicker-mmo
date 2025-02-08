import React from 'react';
import { MessageSquareIcon, ArrowLeftIcon, Share2Icon, DownloadIcon, SettingsIcon } from 'lucide-react';
import { UserProfile } from './UserProfile';
import type { MenuView } from './types';

interface MenuHeaderProps {
  currentView: MenuView;
  onNavigate?: (view: MenuView) => void;
  isDesktop?: boolean;
  onBack?: () => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({ currentView, onNavigate, isDesktop, onBack }) => {
  const getActionButton = () => {
    switch (currentView) {
      case 'inventory':
        return (
          <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
            <span className="text-white/50 font-semibold">Share</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <Share2Icon className="w-5 h-5" />
            </div>
          </button>
        );
      case 'social':
        return (
          <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
            <span className="text-white/50 font-semibold">Export</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <DownloadIcon className="w-5 h-5" />
            </div>
          </button>
        );
      case 'preferences':
      case 'cursors':
        return (
          <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
            <span className="text-white/50 font-semibold">Settings</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <SettingsIcon className="w-5 h-5" />
            </div>
          </button>
        );
      default:
        return (
          <button className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors">
            <span className="text-white/50 font-semibold">Chat</span>
            <div className="text-white/50 [&>svg]:fill-white/[0.06]">
              <MessageSquareIcon className="w-5 h-5" />
            </div>
          </button>
        );
    }
  };

  return (
    <div className={`flex justify-between items-center px-6 pb-4 ${isDesktop ? 'pt-2' : ''}`}>
      <UserProfile onNavigate={onNavigate} isDesktop={isDesktop} />
      {getActionButton()}
    </div>
  );
};