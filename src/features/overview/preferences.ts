import { useSyncExternalStore } from 'react';
import { useSettings } from '../settings/store';

export const qualityBudget = {
  low: { dpr: 1, labels: 16, detailPixels: 18, spherePixels: 18 },
  medium: { dpr: 1.5, labels: 32, detailPixels: 10, spherePixels: 12 },
  high: { dpr: 1.5, labels: 48, detailPixels: 6, spherePixels: 9 },
} as const;

export function useOverviewBudget() {
  const quality = useSettings((state) => state.overviewQuality);
  const performance = useSettings((state) => state.performanceMode);
  return qualityBudget[performance ? 'low' : quality];
}
const contrastQuery = '(forced-colors: active)';
const subscribe = (notify: () => void) => {
  const query = matchMedia(contrastQuery);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
export function useHighContrast() {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(contrastQuery).matches,
    () => false,
  );
}
