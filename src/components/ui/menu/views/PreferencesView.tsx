import React from 'react';
import { useGameStore } from '../../../../store/gameStore';

interface PreferencesViewProps {
  onBack: () => void;
}

export const PreferencesView: React.FC<PreferencesViewProps> = ({ onBack }) => {
  const { afkTimeout, hideCursorWhilePanning, setAfkTimeout, setHideCursorWhilePanning } = useGameStore();

  return (
    <div className="px-4 pb-16 preferences-view-content">
      <div className="space-y-6">
        <div>
          <label className="flex items-center justify-between text-white mb-4">
            <span>Hide cursor when panning</span>
            <button
              onClick={() => setHideCursorWhilePanning(!hideCursorWhilePanning)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                hideCursorWhilePanning ? 'bg-blue-500' : 'bg-white/10'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                hideCursorWhilePanning ? 'left-7' : 'left-1'
              }`} />
            </button>
          </label>
        </div>

        <div>
          <label className="block text-white mb-4">AFK Timer</label>
          <div className="grid grid-cols-3 gap-2">
            {[30, 60, 180].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setAfkTimeout(seconds * 1000)}
                className={`py-2 px-4 rounded-xl transition-colors ${
                  afkTimeout === seconds * 1000
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/[0.03] text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                {seconds >= 60 ? `${seconds / 60} Min` : `${seconds} Sec`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full bg-white/[0.03] hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors rounded-2xl py-4 text-white font-semibold mt-6"
      >
        Back
      </button>
    </div>
  );
};