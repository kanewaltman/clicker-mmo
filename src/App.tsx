import React from 'react';
import { World } from './components/World';
import { useGameStore } from './store/gameStore';
import { AuthButton } from './components/AuthButton';

function App() {
  const resources = useGameStore((state) => state.resources);
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Cursor Clicker MMO</h1>
          <div className="flex items-center gap-4">
            <span className="text-xl">💰 {resources}</span>
            {!isMobile && <AuthButton />}
          </div>
        </div>
      </div>
      <div className="flex-1">
        <World />
      </div>
    </div>
  );
}

export default App;