export type MenuView = 'main' | 'inventory' | 'social' | 'map' | 'leaderboard' | 'more' | 'preferences' | 'cursors';

export interface MenuTransitionOptions {
  duration?: number;
  easing?: string;
  direction?: 'left' | 'right';
}

export interface MenuState {
  view: MenuView;
  history: MenuView[];
}

export interface MenuAction {
  type: 'PUSH_VIEW' | 'POP_VIEW' | 'RESET';
  payload?: MenuView;
}