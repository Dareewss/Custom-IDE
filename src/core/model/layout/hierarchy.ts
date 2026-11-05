import { layoutEdges } from './edges';
import { branchDimensions, branchGroups, branchLanes, loopDimensions } from './control-flow';
import { collectionCells, collectionDimensions } from './collections';
import { functionWidth, headerPosition } from './metrics';
import { geometryTokens as tokens } from './tokens';
import type { CodeModel } from '../types';
import type { GraphLayout, Vec3 } from './types';

/** Deterministic containment layout; all measurement uses model data in a worker. */
export function hierarchicalLayout(model: CodeModel): GraphLayout {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const sizes = new Map<string, Vec3>();
  const roots = model.nodes
    .filter((node) => node.parentId === null)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const pending = roots.map((node) => ({ id: node.id, visited: false }));
  while (pending.length) {
    const current = pending.pop()!;
    const node = byId.get(current.id)!;
    if (!current.visited) {
      pending.push({ id: node.id, visited: true });
      for (const child of node.children) pending.push({ id: child, visited: false });
      continue;
    }
    if (node.meta.role === 'parameter') {
      sizes.set(node.id, [tokens.portRadius * 2, tokens.portRadius * 2, tokens.portRadius * 2]);
      continue;
    }
    const parameters = node.children.filter((id) => byId.get(id)?.meta.role === 'parameter');
    const children = node.children
      .filter((id) => byId.get(id)?.meta.role !== 'parameter')
      .map((id) => sizes.get(id)!);
    if (node.kind === 'condition') {
      sizes.set(node.id, branchDimensions(branchGroups(node, byId, sizes)));
      continue;
    }
    if (node.kind === 'loop') {
      sizes.set(node.id, loopDimensions(children));
      continue;
    }
    const isFunction = node.kind === 'function' || node.kind === 'method';
    const collection = node.kind === 'collection' ? collectionDimensions(node) : null;
    const variableSize = tokens.variableRadius * 2;
    const baseWidth =
      collection?.width ??
      (node.kind === 'variable'
        ? variableSize
        : node.kind === 'file'
          ? tokens.fileWidth
          : node.kind === 'class'
            ? tokens.classWidth
            : isFunction
              ? functionWidth(node, parameters.length)
              : tokens.leafWidth);
    const contentInset = collection?.height ?? tokens.inset;
    const baseHeight =
      collection?.height ??
      (node.kind === 'variable'
        ? variableSize
        : node.kind === 'file'
          ? tokens.fileHeight
          : node.kind === 'class'
            ? tokens.classHeight
            : isFunction
              ? tokens.functionHeaderHeight
              : tokens.leafHeight);
    const width = Math.max(baseWidth, ...children.map((size) => size[0] + tokens.inset));
    const height = Math.max(
      baseHeight,
      children.length
        ? children.reduce<number>((sum, size) => sum + size[1] + tokens.siblingGap, contentInset)
        : 0,
    );
    const depth =
      node.kind === 'class'
        ? tokens.classDepth
        : isFunction
          ? tokens.functionRadius * 2
          : node.kind === 'collection'
            ? (tokens.cellOffset + tokens.cellDepth / 2) * 2
            : node.kind === 'variable'
              ? variableSize
              : node.kind === 'file' || children.length
                ? tokens.containerDepth
                : tokens.leafDepth;
    sizes.set(node.id, [width, height, depth]);
  }
  const external = roots.filter((node) => node.kind === 'external');
  const files = roots.filter((node) => node.kind !== 'external');
  const rootCount = files.length + Number(external.length > 0);
  const columns = Math.max(1, Math.ceil(Math.sqrt(rootCount)));
  const cellWidth =
    Math.max(tokens.fileWidth, ...files.map((node) => sizes.get(node.id)![0])) + tokens.fileGap;
  const cellHeight =
    Math.max(tokens.fileHeight, ...files.map((node) => sizes.get(node.id)![1])) + tokens.fileGap;
  const place = files.map((node, index) => {
    const i = index + Number(external.length > 0);
    return {
      id: node.id,
      position: [(i % columns) * cellWidth, -Math.floor(i / columns) * cellHeight, 0] as Vec3,
    };
  });
  // External symbols share one compact region instead of consuming a file-sized cell each.
  const extColumns = Math.max(1, Math.ceil(Math.sqrt(external.length)));
  for (let i = 0; i < external.length; i++)
    place.push({
      id: external[i].id,
      position: [
        (i % extColumns) * tokens.externalWidth,
        -Math.floor(i / extColumns) * tokens.externalHeight,
        0,
      ],
    });
  const items: GraphLayout['items'] = Object.create(null) as GraphLayout['items'];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  while (place.length) {
    const current = place.pop()!;
    const node = byId.get(current.id)!;
    const size = sizes.get(node.id)!;
    items[node.id] = { id: node.id, position: current.position, size };
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], current.position[axis] - size[axis] / 2);
      max[axis] = Math.max(max[axis], current.position[axis] + size[axis] / 2);
    }
    let top =
      current.position[1] +
      size[1] / 2 -
      (node.kind === 'collection' ? collectionDimensions(node).height : tokens.inset);
    const parameters = node.children.filter((id) => byId.get(id)?.meta.role === 'parameter');
    const header = headerPosition(items[node.id]);
    for (let index = 0; index < parameters.length; index++)
      place.push({
        id: parameters[index],
        position: [
          current.position[0] + (index - (parameters.length - 1) / 2) * tokens.portGap,
          header[1] + tokens.functionRadius + tokens.portRadius,
          current.position[2] + tokens.depthStep,
        ],
      });
    if (node.kind === 'condition') {
      const groups = branchGroups(node, byId, sizes);
      const lanes = branchLanes(groups, items[node.id]);
      for (const lane of lanes) {
        let branchTop = current.position[1] + size[1] / 2 - tokens.branchHeader;
        for (const child of lane.children) {
          const childSize = sizes.get(child)!;
          place.push({
            id: child,
            position: [
              lane.position[0],
              branchTop - childSize[1] / 2,
              current.position[2] + tokens.depthStep,
            ],
          });
          branchTop -= childSize[1] + tokens.siblingGap;
        }
      }
      continue;
    }
    if (node.kind === 'loop') {
      const bodyHeight = node.children.reduce(
        (sum, child) => sum + sizes.get(child)![1] + tokens.siblingGap,
        0,
      );
      top = current.position[1] + bodyHeight / 2;
    }
    for (const child of node.children.filter((id) => byId.get(id)?.meta.role !== 'parameter')) {
      const childSize = sizes.get(child)!;
      place.push({
        id: child,
        position: [
          current.position[0],
          top - childSize[1] / 2,
          current.position[2] + tokens.depthStep,
        ],
      });
      top -= childSize[1] + tokens.siblingGap;
    }
  }
  if (!roots.length)
    return {
      items,
      cells: {},
      branches: {},
      externalCluster: null,
      edges: [],
      bounds: { min: [-1, -1, -1], max: [1, 1, 1] },
    };
  const center = min.map((value, axis) => (value + max[axis]) / 2);
  for (const item of Object.values(items))
    for (let axis = 0; axis < 3; axis++) item.position[axis] -= center[axis];
  const cells: GraphLayout['cells'] = Object.create(null) as GraphLayout['cells'];
  for (const node of model.nodes)
    if (node.kind === 'collection') cells[node.id] = collectionCells(node, items[node.id]);
  const branches: GraphLayout['branches'] = {};
  for (const node of model.nodes)
    if (node.kind === 'condition')
      branches[node.id] = branchLanes(branchGroups(node, byId, sizes), items[node.id]);
  const externalCluster: GraphLayout['externalCluster'] = external.length
    ? {
        id: 'external-cluster',
        position: items[external[0].id].position.slice() as Vec3,
        size: [tokens.externalWidth, tokens.externalHeight, tokens.leafDepth],
      }
    : null;
  const result: GraphLayout = {
    items,
    cells,
    branches,
    externalCluster,
    edges: [],
    bounds: {
      min: min.map((value, i) => value - center[i]) as Vec3,
      max: max.map((value, i) => value - center[i]) as Vec3,
    },
  };
  result.edges = layoutEdges(model, result);
  return result;
}
