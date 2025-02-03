import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CURSOR_OPTIONS = ['👆', '👇', '👈', '👉', '🖐️', '✌️', '👊', '🫵', '☝️', '🫰'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { username, cursorEmoji, afkTimeout, user, setUsername, setCursorEmoji, setAfkTimeout } = useGameStore();
  const [nameInput, setNameInput] = useState(username);
  const [timeoutInput, setTimeoutInput] = useState(afkTimeout / 1000);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Load username from user_progress when authenticated
      const loadUsername = async () => {
        const { data, error } = await supabase
          .from('user_progress')
          .select('username')
          .eq('user_id', user.id)
          .single();

        if (!error && data?.username) {
          setNameInput(data.username);
          setUsername(data.username);
        }
      };
      loadUsername();
    }
  }, [user, setUsername]);

  const checkUsernameAvailability = async (name: string) => {
    if (!name.trim()) {
      setNameError('Username cannot be empty');
      return false;
    }

    if (name.length < 3) {
      setNameError('Username must be at least 3 characters');
      return false;
    }

    if (name.length > 15) {
      setNameError('Username must be less than 15 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setNameError('Username can only contain letters, numbers, and underscores');
      return false;
    }

    setIsCheckingName(true);
    const { data, error } = await supabase
      .from('user_progress')
      .select('username')
      .eq('username', name)
      .neq('user_id', user?.id || '')
      .maybeSingle();

    setIsCheckingName(false);

    if (error) {
      setNameError('Error checking username availability');
      return false;
    }

    if (data) {
      setNameError('Username is already taken');
      return false;
    }

    setNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user && !(await checkUsernameAvailability(nameInput))) {
      return;
    }

    setUsername(nameInput);
    setAfkTimeout(Math.max(3000, Math.min(300000, timeoutInput * 1000)));

    if (user) {
      // Update username in user_progress when authenticated
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          username: nameInput
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating username:', error);
        return;
      }
    }

    onClose();
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNameInput(newName);
    if (user) {
      await checkUsernameAvailability(newName);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Username</label>
            <input
              type="text"
              value={nameInput}
              onChange={handleNameChange}
              className={`w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 ${
                nameError ? 'focus:ring-red-500 border border-red-500' : 'focus:ring-blue-500'
              }`}
              maxLength={15}
              required
              disabled={isCheckingName}
            />
            {nameError && (
              <p className="text-red-500 text-sm mt-1">{nameError}</p>
            )}
            {isCheckingName && (
              <p className="text-blue-400 text-sm mt-1">Checking availability...</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">AFK Timer (seconds)</label>
            <input
              type="number"
              value={timeoutInput}
              onChange={(e) => setTimeoutInput(Number(e.target.value))}
              min={3}
              max={300}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-gray-400 text-sm mt-1">Set between 3 seconds and 5 minutes</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Cursor Style</label>
            <div className="grid grid-cols-5 gap-2">
              {CURSOR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCursorEmoji(emoji)}
                  className={`text-2xl p-2 rounded hover:bg-gray-600 ${
                    cursorEmoji === emoji ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700 transition-colors"
            disabled={isCheckingName || (user && !!nameError)}
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};