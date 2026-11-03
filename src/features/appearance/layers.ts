export const layerNames = ['backing', 'orbs', 'foreground', 'content'] as const;
export type LayerName = (typeof layerNames)[number];

export function debugLayers(search: string, development: boolean): Record<LayerName, boolean> {
  const selected = development ? new URLSearchParams(search).get('glassLayers') : null;
  const names = selected?.split(',').map((name) => name.trim());
  return Object.fromEntries(
    layerNames.map((name) => [name, names ? names.includes(name) : true]),
  ) as Record<LayerName, boolean>;
}
