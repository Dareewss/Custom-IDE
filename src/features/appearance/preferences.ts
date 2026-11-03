import { useCallback, useSyncExternalStore } from 'react';

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
export function useReducedMotionPreference() {
  const subscribeMotion = useCallback((notify: () => void) => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, []);
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}
