import type { VisibilitySource } from '@cockpit/client';
import { AppState } from 'react-native';

/** The poller's "hidden" on a phone: the app is in the background. A module constant, as the hook requires. */
export const appStateVisibility: VisibilitySource = {
  isHidden: () => AppState.currentState !== 'active',
  subscribe: (listener) => {
    const sub = AppState.addEventListener('change', (state) => {
      if (__DEV__) console.log(`[live] app ${state}${state === 'active' ? ': catch-up poll' : ': polling paused'}`);
      listener();
    });
    return () => sub.remove();
  },
};
