import React, { useState, useRef } from 'react';
import { 
  PencilIcon,
  MousePointerIcon,
  KeyboardIcon,
  SettingsIcon,
  XIcon
} from 'lucide-react';
import { MenuItem } from '../MenuItem';
import { useGameStore } from '../../../../store/gameStore';
import { supabase } from '../../../../lib/supabase';
import type { MenuView } from '../types';

interface MoreViewProps {
  onBack: () => void;
  onNavigate: (view: MenuView) => void;
}

export const MoreView: React.FC<MoreViewProps> = ({ onBack, onNavigate }) => {
  const { username, setUsername, user } = useGameStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(username);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const menuVariant = 'large';

  const checkUsernameAvailability = async (name: string) => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return false;
    }

    if (name.length < 3) {
      setError('Name must be at least 3 characters');
      return false;
    }

    if (name.length > 15) {
      setError('Name must be less than 15 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError('Name can only contain letters, numbers, and underscores');
      return false;
    }

    if (user) {
      setIsCheckingName(true);
      
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('username')
          .eq('username', name)
          .neq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setError('Username is already taken');
          return false;
        }

        setError(null);
        return true;
      } catch (error) {
        console.error('Error checking username:', error);
        setError('Error checking username availability');
        return false;
      } finally {
        setIsCheckingName(false);
      }
    }

    setError(null);
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNameInput(newName);

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    if (user && newName !== username) {
      checkTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(newName);
      }, 500);
    } else {
      setError(null);
      setIsCheckingName(false);
    }
  };

  const handleNameSubmit = async () => {
    if (user && !(await checkUsernameAvailability(nameInput))) {
      return;
    }

    setUsername(nameInput);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="px-4 pb-16 more-view-content">
      {isEditing ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              className={`flex-1 bg-white/[0.03] text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 ${
                error ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-blue-500'
              }`}
              placeholder="Enter new name"
              maxLength={15}
              autoFocus
            />
            <button
              onClick={() => setIsEditing(false)}
              className="p-3 bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] rounded-xl transition-colors"
            >
              <XIcon className="w-5 h-5 text-white/70" />
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-sm mb-2 px-2">{error}</div>
          )}
          {isCheckingName && (
            <div className="text-blue-400 text-sm mb-2 px-2">Checking availability...</div>
          )}
          <button
            onClick={handleNameSubmit}
            disabled={isCheckingName || (user && !!error)}
            className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl py-3 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Name
          </button>
        </div>
      ) : (
        <div className="flex flex-col w-full">
          <MenuItem 
            label="Change Name" 
            icon={PencilIcon}
            onClick={() => setIsEditing(true)}
            isFirst
            variant={menuVariant}
          />
          <MenuItem 
            label="Cursors" 
            icon={MousePointerIcon}
            onClick={() => onNavigate('cursors')}
            variant={menuVariant}
          />
          <MenuItem 
            label="Hotkeys" 
            icon={KeyboardIcon}
            variant={menuVariant}
          />
          <MenuItem 
            label="Preferences" 
            icon={SettingsIcon}
            onClick={() => onNavigate('preferences')}
            isLast
            variant={menuVariant}
          />
        </div>
      )}

      <button
        onClick={onBack}
        className="w-full bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold mt-4"
      >
        Back
      </button>
    </div>
  );
};