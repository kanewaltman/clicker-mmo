import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { X } from 'lucide-react';

const CURSOR_OPTIONS = ['👆', '👇', '👈', '👉', '🖐️', '✌️', '👊', '🫵', '☝️', '🫰'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { username, cursorEmoji, afkTimeout, setUsername, setCursorEmoji, setAfkTimeout } = useGameStore();
  const [nameInput, setNameInput] = useState(username);
  const [timeoutInput, setTimeoutInput] = useState(afkTimeout / 1000); // Convert to seconds for display

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsername(nameInput);
    setAfkTimeout(Math.max(3000, Math.min(300000, timeoutInput * 1000))); // Convert back to ms, clamp between 3s and 5min
    onClose();
  };

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
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={15}
              required
            />
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
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};