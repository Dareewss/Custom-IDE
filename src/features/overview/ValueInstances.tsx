import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { CodeNode, ValueKind } from '../../core/model/types';
import type { Vec3 } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';
import { valueColor } from './value-colors';
import type { SceneColors } from './scene-tokens';

export interface ValueInstance {
  node: CodeNode;
  position: Vec3;
  kind?: ValueKind;
  detail?: string;
  muted?: boolean;
}

export function ValueInstances({
  instances,
  shape,
  colors,
}: {
  instances: ValueInstance[];
  shape: 'sphere' | 'cell';
  colors: SceneColors;
}) {
  const ref = useRef<InstancedMesh>(null);
  const transform = useRef(new Object3D());
  const invalidate = useThree((state) => state.invalidate);
  const selected = useOverview((state) => state.selectedNodeId);
  const hovered = useOverview((state) => state.hoveredNodeId);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = transform.current;
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    invalidate();
  }, [instances, invalidate]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new Color();
    instances.forEach((instance, index) =>
      mesh.setColorAt(
        index,
        color
          .set(
            instance.node.id === selected || instance.node.id === hovered
              ? colors.active
              : valueColor(instance.kind, colors),
          )
          .multiplyScalar(
            instance.muted && instance.node.id !== selected && instance.node.id !== hovered
              ? colors.searchDim
              : 1,
          ),
      ),
    );
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [instances, colors, selected, hovered, invalidate]);
  const hit = (event: ThreeEvent<PointerEvent>) => {
    const item = event.instanceId === undefined ? undefined : instances[event.instanceId];
    if (item) {
      event.stopPropagation();
      setOverviewHover(item.node.id, item.detail ?? null);
    }
  };
  if (!instances.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      onPointerOver={hit}
      onPointerMove={hit}
      onPointerOut={() => setOverviewHover(null)}
      onClick={(event) => {
        const item = event.instanceId === undefined ? undefined : instances[event.instanceId];
        if (item) {
          event.stopPropagation();
          selectOverviewNode(item.node);
        }
      }}
    >
      {shape === 'sphere' ? (
        <sphereGeometry
          args={[tokens.variableRadius, tokens.variableSegments, tokens.variableSegments]}
        />
      ) : (
        <boxGeometry args={[tokens.cellWidth, tokens.cellHeight, tokens.cellDepth]} />
      )}
      <meshLambertMaterial color={colors.light} transparent opacity={colors.valueOpacity} />
    </instancedMesh>
  );
}
