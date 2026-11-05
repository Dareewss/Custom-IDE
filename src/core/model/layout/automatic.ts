import type { CodeModel } from '../types';
import type { GraphLayout, LayoutItem, Vec3 } from './types';
import { hierarchicalLayout } from './hierarchy';
import { layoutEdges } from './edges';
import { geometryTokens as tokens } from './tokens';

function randomFor(id: string, seed: number): number {
  let hash = seed ^ 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}
interface Particle {
  id: string;
  position: Vec3;
  size: Vec3;
}
/** Seeded file forces, rectangle separation and stable anchors; only called in a worker. */
export function automaticLayout(
  model: CodeModel,
  previous: GraphLayout | null = null,
  seed = 0,
): GraphLayout {
  const layout = hierarchicalLayout(model);
  const files = model.nodes
    .filter((node) => node.kind === 'file')
    .sort((a, b) => a.id.localeCompare(b.id));
  const particles: Particle[] = [];
  const columns = Math.max(1, Math.ceil(Math.sqrt(files.length)));
  let x = 0,
    y = 0,
    rowHeight = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i],
      item = layout.items[file.id];
    if (i % columns === 0) {
      x = 0;
      y -= rowHeight + (i ? tokens.fileGap : 0);
      rowHeight = 0;
    }
    const position = previous?.items[file.id]?.position.slice() as Vec3 | undefined;
    particles.push({
      id: file.id,
      size: item.size,
      position: position ?? [
        x + item.size[0] / 2,
        y - item.size[1] / 2,
        (randomFor(file.id, seed) - 0.5) * tokens.forceDepth,
      ],
    });
    x += item.size[0] + tokens.fileGap;
    rowHeight = Math.max(rowHeight, item.size[1]);
  }
  const byFile = new Map(files.map((file) => [file.fileId, file.id]));
  const byNode = new Map(model.nodes.map((node) => [node.id, node]));
  const byParticle = new Map(particles.map((p) => [p.id, p]));
  const links = model.edges.flatMap((edge) => {
    const a = byFile.get(byNode.get(edge.from)?.fileId ?? ''),
      b = byFile.get(byNode.get(edge.to)?.fileId ?? '');
    return a && b && a !== b ? [[a, b]] : [];
  });
  // Previous positions are exact anchors unless an expanded/new file overlaps them.
  for (let iteration = 0; iteration < tokens.forceIterations; iteration++) {
    if (!previous)
      for (const [a, b] of links) {
        const first = byParticle.get(a)!,
          second = byParticle.get(b)!;
        for (let axis = 0; axis < 3; axis++) {
          const delta = (second.position[axis] - first.position[axis]) * tokens.forceAttraction;
          first.position[axis] += delta;
          second.position[axis] -= delta;
        }
      }
    let overlapping = false;
    for (let i = 0; i < particles.length; i++)
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i],
          b = particles[j];
        const dx = b.position[0] - a.position[0],
          dy = b.position[1] - a.position[1];
        const overlapX = (a.size[0] + b.size[0]) / 2 + tokens.fileGap - Math.abs(dx);
        const overlapY = (a.size[1] + b.size[1]) / 2 + tokens.fileGap - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        overlapping = true;
        const axis = overlapX < overlapY ? 0 : 1;
        const sign =
          Math.sign(axis === 0 ? dx : dy) || (randomFor(a.id + b.id, seed) > 0.5 ? 1 : -1);
        const push = ((axis === 0 ? overlapX : overlapY) + tokens.forceEpsilon) / 2;
        a.position[axis] -= push * sign;
        b.position[axis] += push * sign;
      }
    if (previous && !overlapping) break;
  }
  // A final ordered sweep guarantees separation after forces; settled neighbors never move.
  const ordered = particles
    .slice()
    .sort((a, b) => a.position[0] - b.position[0] || a.id.localeCompare(b.id));
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    for (let j = 0; j < i; j++) {
      const before = ordered[j];
      if (
        Math.abs(current.position[1] - before.position[1]) >=
        (current.size[1] + before.size[1]) / 2 + tokens.fileGap
      )
        continue;
      if (
        Math.abs(current.position[0] - before.position[0]) >=
        (current.size[0] + before.size[0]) / 2 + tokens.fileGap
      )
        continue;
      current.position[0] =
        before.position[0] +
        (current.size[0] + before.size[0]) / 2 +
        tokens.fileGap +
        tokens.forceEpsilon;
      j = -1;
    }
  }
  const shifts = new Map<string, Vec3>();
  for (const file of files) {
    const item = layout.items[file.id],
      target = byParticle.get(file.id)!;
    if (file.fileId !== null)
      shifts.set(file.fileId, target.position.map((v, i) => v - item.position[i]) as Vec3);
  }
  for (const node of model.nodes) {
    const delta = node.fileId ? shifts.get(node.fileId) : undefined;
    if (!delta) continue;
    translate(layout.items[node.id], delta);
    if (node.kind === 'file')
      layout.items[node.id].position = byParticle.get(node.id)!.position.slice() as Vec3;
    for (const cell of layout.cells[node.id] ?? [])
      cell.position = cell.position.map((v, i) => v + delta[i]) as Vec3;
    for (const branch of layout.branches[node.id] ?? [])
      branch.position = branch.position.map((v, i) => v + delta[i]) as Vec3;
  }
  const minX = Math.min(0, ...particles.map((p) => p.position[0] - p.size[0] / 2));
  const external = model.nodes.filter((node) => node.kind === 'external');
  const extColumns = Math.max(1, Math.ceil(Math.sqrt(external.length)));
  const extX = minX - tokens.fileGap - extColumns * tokens.externalWidth;
  const extY = particles[0]?.position[1] ?? 0;
  external.forEach((node, i) => {
    layout.items[node.id].position = [
      extX + (i % extColumns) * tokens.externalWidth,
      extY - Math.floor(i / extColumns) * tokens.externalHeight,
      0,
    ];
  });
  if (layout.externalCluster) layout.externalCluster.position = [extX, extY, 0];
  layout.edges = layoutEdges(model, layout);
  const items = Object.values(layout.items);
  if (items.length)
    layout.bounds = {
      min: [0, 1, 2].map((axis) =>
        Math.min(...items.map((item) => item.position[axis] - item.size[axis] / 2)),
      ) as Vec3,
      max: [0, 1, 2].map((axis) =>
        Math.max(...items.map((item) => item.position[axis] + item.size[axis] / 2)),
      ) as Vec3,
    };
  return layout;
}
function translate(item: LayoutItem, delta: Vec3) {
  item.position = item.position.map((v, i) => v + delta[i]) as Vec3;
}
