import type { CodeModel } from '../types';
import type { GraphLayout } from './types';
/** Retain source identities hidden by view projections; remove genuinely deleted identities. */
export function rememberLayout(
  current: GraphLayout,
  previous: GraphLayout | null,
  model: CodeModel,
): GraphLayout {
  const valid = new Set(model.nodes.map((node) => node.id));
  const items: GraphLayout['items'] = Object.create(null) as GraphLayout['items'];
  for (const [id, item] of Object.entries(previous?.items ?? {}))
    if (valid.has(id)) items[id] = item;
  Object.assign(items, current.items);
  return { ...current, items };
}
