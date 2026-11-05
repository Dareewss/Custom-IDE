import { useThree, useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSpring } from '@react-spring/three';
import { useReducedMotion } from 'motion/react';
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
  slot?: string;
}

export function ValueInstances({
  instances,
  shape,
  colors,
  root,
  added,
}: {
  instances: ValueInstance[];
  shape: 'sphere' | 'cell';
  colors: SceneColors;
  root: Vec3;
  added: ReadonlySet<string>;
}) {
  const ref = useRef<InstancedMesh>(null);
  const transform = useRef(new Object3D());
  const invalidate = useThree((state) => state.invalidate);
  const selected = useOverview((state) => state.selectedNodeId);
  const hovered = useOverview((state) => state.hoveredNodeId);
  const previous = useRef<{ root: Vec3; positions: Map<string, Vec3> } | null>(null);
  const moves = useRef<{ from: Vec3; to: Vec3; enter: boolean }[]>([]);
  const animating = useRef(false);
  const reduced = useReducedMotion();
  const [spring, api] = useSpring(() => ({ progress: 1 }));
  const apply = useCallback((progress: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    const object = transform.current;
    moves.current.forEach((move, index) => {
      object.position.set(
        ...(move.to.map((v, i) => move.from[i] + (v - move.from[i]) * progress) as Vec3),
      );
      object.scale.setScalar(
        move.enter ? tokens.enterScale + (1 - tokens.enterScale) * progress : 1,
      );
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const before = previous.current;
    const positions = new Map<string, Vec3>();
    moves.current = instances.map((instance) => {
      const key = `${instance.node.id}:${instance.slot ?? ''}`;
      const old = before?.positions.get(key);
      positions.set(key, instance.position);
      return {
        from: old
          ? (old.map((v, i) => v - (before!.root[i] - root[i])) as Vec3)
          : instance.position,
        to: instance.position,
        enter:
          !old && (added.has(instance.node.id) || (shape === 'cell' && !!before?.positions.size)),
      };
    });
    previous.current = { root, positions };
    animating.current =
      !reduced &&
      moves.current.some(
        (move) => move.enter || move.from.some((v, i) => Math.abs(v - move.to[i]) > 1e-6),
      );
    apply(0);
    mesh.computeBoundingSphere();
    const startBounds = mesh.boundingSphere?.clone();
    apply(1);
    mesh.computeBoundingSphere();
    if (startBounds) mesh.boundingSphere?.union(startBounds);
    if (animating.current) {
      apply(0);
      void api.start({
        from: { progress: 0 },
        to: { progress: 1 },
        reset: true,
        config: { duration: tokens.updateDuration },
        onChange: () => invalidate(),
        onRest: () => {
          animating.current = false;
          apply(1);
          ref.current?.computeBoundingSphere();
          invalidate();
        },
      });
    } else {
      api.stop();
      apply(1);
    }
    invalidate();
    return () => {
      api.stop();
    };
  }, [instances, root, added, shape, reduced, api, apply, invalidate]);
  useFrame(() => {
    if (animating.current) apply(spring.progress.get());
  });
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
