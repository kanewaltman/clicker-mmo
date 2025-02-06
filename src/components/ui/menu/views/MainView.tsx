import React from 'react';
import { 
  LayoutGridIcon,
  UsersIcon,
  GlobeIcon,
  TrophyIcon,
  SettingsIcon
} from 'lucide-react';
import { MenuItem } from '../MenuItem';
import type { MenuView } from '../types';

interface MainViewProps {
  onNavigate: (view: MenuView) => void;
  onOpenSettings: () => void;
  onTeleport: () => void;
  canTeleport: boolean;
}

export const MainView: React.FC<MainViewProps> = ({
  onNavigate,
  onOpenSettings,
  onTeleport,
  canTeleport
}) => {
  const menuVariant = 'large';

  return (
    <div className="px-4 pb-16 main-view-content">
      <div className="flex flex-col w-full">
        <MenuItem 
          label="Inventory" 
          icon={LayoutGridIcon}
          onClick={() => onNavigate('inventory')}
          isFirst
          variant={menuVariant}
        />
        <MenuItem 
          label="Social" 
          icon={UsersIcon}
          onClick={() => onNavigate('social')}
          variant={menuVariant}
        />
        <MenuItem 
          label="World Map" 
          icon={GlobeIcon}
          onClick={canTeleport ? onTeleport : undefined}
          variant={menuVariant}
        />
        <MenuItem 
          label="Leaderboard" 
          icon={TrophyIcon}
          onClick={() => onNavigate('leaderboard')}
          variant={menuVariant}
        />
        <MenuItem 
          label="Preferences" 
          icon={SettingsIcon}
          onClick={onOpenSettings}
          isLast
          variant={menuVariant}
        />
      </div>
    </div>
  );
};