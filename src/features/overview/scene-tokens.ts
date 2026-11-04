import { useMemo, useSyncExternalStore } from 'react';

export interface SceneColors {
  fill: string;
  active: string;
  hover: string;
  nodeOpacity: number;
  containerOpacity: number;
  activeOpacity: number;
}
const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-preset', 'style'],
  });
  return () => observer.disconnect();
};
const snapshot = () => {
  const style = getComputedStyle(document.documentElement);
  return JSON.stringify({
    fill: style.getPropertyValue('--blob-1').trim(),
    active: style.getPropertyValue('--accent').trim(),
    hover: style.getPropertyValue('--blob-2').trim(),
    nodeOpacity: Number(style.getPropertyValue('--overview-node-opacity').trim()),
    containerOpacity: Number(style.getPropertyValue('--overview-container-opacity').trim()),
    activeOpacity: Number(style.getPropertyValue('--overview-active-opacity').trim()),
  });
};
/** Observe the applied CSS tokens, including preset overrides, without stale theme reads. */
export function useSceneColors(): SceneColors {
  const value = useSyncExternalStore(subscribe, snapshot, () => '{}');
  return useMemo(() => JSON.parse(value) as SceneColors, [value]);
}
