import { useSyncExternalStore } from 'react';

const reducedTransparency = '(prefers-reduced-transparency: reduce)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(reducedTransparency);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
export function useReducedTransparency() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedTransparency).matches,
    () => false,
  );
}
