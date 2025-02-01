export const TOWN_CENTER = { x: 0, y: 0 };
export const TOWN_RADIUS = 200;

export const RARITY_COLORS = {
  common: 'text-green-400',
  uncommon: 'text-blue-400',
  rare: 'text-purple-400',
  legendary: 'text-yellow-400'
} as const;

export const RARITY_SCALES = {
  common: 'scale-100',
  uncommon: 'scale-125',
  rare: 'scale-150',
  legendary: 'scale-175'
} as const;

export const BROADCAST_INTERVAL = 50;
export const INTERPOLATION_SPEED = 0.15;
export const CURSOR_TIMEOUT = 5000;
export const STRUCTURE_DAMAGE = 10;
export const STRUCTURE_MAX_HEALTH = 1000;
export const GATHER_INTERVAL = 2000;
export const GATHER_AMOUNT = 1;