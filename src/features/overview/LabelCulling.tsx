import { labelPixels } from './label-pixels';
import { useOverviewBudget } from './preferences';
import { Group, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { visibleLabels, type LabelBox } from './label-budget';
import { useOverview } from './store';

interface LabelEntry {
  get: () => Group | null;
  width: number;
  height: number;
  nodeId?: string;
  priority: number;
}
const registries = new WeakMap<HTMLCanvasElement, Map<string, LabelEntry>>();
export function labelRegistry(canvas: HTMLCanvasElement) {
  let registry = registries.get(canvas);
  if (!registry) {
    registry = new Map();
    registries.set(canvas, registry);
  }
  return registry;
}
const point = new Vector3(),
  projected = new Vector3(),
  parentScale = new Vector3();
export function LabelCulling() {
  const budget = useOverviewBudget();
  useFrame((state) => {
    state.camera.updateMatrixWorld();
    const registry = labelRegistry(state.gl.domElement),
      boxes: LabelBox[] = [];
    const selection = useOverview.getState();
    for (const [id, entry] of registry) {
      const group = entry.get();
      if (!group) continue;
      let parent = group.parent,
        hidden = false;
      while (parent) {
        if (!parent.visible) {
          hidden = true;
          break;
        }
        parent = parent.parent;
      }
      if (hidden) {
        group.visible = false;
        continue;
      }
      group.getWorldPosition(point);
      projected.copy(point).project(state.camera);
      if (![projected.x, projected.y, projected.z].every(Number.isFinite)) {
        group.visible = false;
        continue;
      }
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1) {
        group.visible = false;
        continue;
      }
      const depth = point.applyMatrix4(state.camera.matrixWorldInverse).z;
      group.parent?.getWorldScale(parentScale);
      const { pixels } = labelPixels(
        depth,
        state.camera.projectionMatrix.elements[5],
        state.size.height,
        parentScale.x,
      );
      boxes.push({
        id,
        x: ((projected.x + 1) / 2) * state.size.width,
        y: ((1 - projected.y) / 2) * state.size.height,
        width: (entry.width / tokens.labelSize) * pixels,
        height: (entry.height / tokens.labelSize) * pixels,
        priority:
          entry.nodeId === selection.selectedNodeId
            ? entry.priority / 100
            : entry.nodeId === selection.hoveredNodeId
              ? 1 + entry.priority / 100
              : entry.priority,
      });
    }
    const visible = visibleLabels(boxes, state.size.width, state.size.height, budget.labels);
    for (const [id, entry] of registry) {
      const group = entry.get();
      if (group) group.visible = visible.has(id);
    }
    state.gl.domElement.dataset.visibleLabels = String(visible.size);
  }, -0.01);
  return null;
}
