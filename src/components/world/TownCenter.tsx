import React from 'react';

interface TownCenterProps {
  x: number;
  y: number;
  radius: number;
  worldPosition: { x: number; y: number };
  onClick: (e: React.MouseEvent) => void;
}

export const TownCenter: React.FC<TownCenterProps> = ({
  x,
  y,
  radius,
  worldPosition,
  onClick
}) => {
  return (
    <>
      <div
        className="absolute rounded-full border-4 border-yellow-500/30 pointer-events-none"
        style={{
          left: x + worldPosition.x - radius,
          top: y + worldPosition.y - radius,
          width: radius * 2,
          height: radius * 2
        }}
      />
      <div
        className="absolute cursor-pointer group"
        style={{
          left: x + worldPosition.x,
          top: y + worldPosition.y,
          transform: 'translate(-50%, -50%)',
          width: '96px',
          height: '96px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClick}
      >
        <div className="text-6xl transition-all duration-200 ease-in-out transform group-hover:scale-110 active:scale-90 active:transition-none">
          🏰
        </div>
      </div>
    </>
  );
};