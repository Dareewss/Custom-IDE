import { useMemo, useSyncExternalStore } from 'react';

export interface SceneColors {
  fill: string;
  active: string;
  hover: string;
  nodeOpacity: number;
  containerOpacity: number;
  activeOpacity: number;
  rimOpacity: number;
  labelText: string;
  labelBacking: string;
  classFill: string;
  functionFill: string;
  error: string;
  number: string;
  string: string;
  bool: string;
  other: string;
  light: string;
  valueOpacity: number;
  searchDim: number;
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
    rimOpacity: Number(style.getPropertyValue('--overview-rim-opacity').trim()),
    labelText: style.getPropertyValue('--text').trim(),
    labelBacking: style.getPropertyValue('--surface').trim(),
    classFill: style.getPropertyValue('--blob-3').trim(),
    functionFill: style.getPropertyValue('--blob-2').trim(),
    error: style.getPropertyValue('--danger').trim(),
    number: style.getPropertyValue('--blob-1').trim(),
    string: style.getPropertyValue('--blob-3').trim(),
    bool: style.getPropertyValue('--blob-2').trim(),
    other: style.getPropertyValue('--palette-slate').trim(),
    light: style.getPropertyValue('--overview-light').trim(),
    valueOpacity: Number(style.getPropertyValue('--overview-value-opacity').trim()),
    searchDim: Number(style.getPropertyValue('--overview-search-dim').trim()),
  });
};
/** Observe the applied CSS tokens, including preset overrides, without stale theme reads. */
export function useSceneColors(): SceneColors {
  const value = useSyncExternalStore(subscribe, snapshot, () => '{}');
  return useMemo(() => JSON.parse(value) as SceneColors, [value]);
}
