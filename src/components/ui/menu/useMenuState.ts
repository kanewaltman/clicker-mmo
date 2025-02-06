import { useReducer } from 'react';
import type { MenuState, MenuAction, MenuView } from './types';

const initialState: MenuState = {
  view: 'main',
  history: []
};

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'PUSH_VIEW':
      return {
        view: action.payload as MenuView,
        history: [...state.history, state.view]
      };
    case 'POP_VIEW':
      return {
        view: state.history[state.history.length - 1],
        history: state.history.slice(0, -1)
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useMenuState() {
  return useReducer(menuReducer, initialState);
}