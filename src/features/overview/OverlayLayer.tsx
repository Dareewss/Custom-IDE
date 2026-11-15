import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { SpringValue } from '@react-spring/three';
import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { useOverview } from './store';
import { useWorkspace } from '../explorer/store';
import { planePoint, type PlaneTransform } from './plane-transform';
import { resolveMarkers, staticMarkers, type OverlayMarker } from './overlay-markers';
import { useTileContext } from './tile-context';
import type { SceneColors } from './scene-tokens';
export type { OverlayMarker } from './overlay-markers';
export function useStaticMarkers() {
  const model = useOverview((s) => s.model),
    breakpoints = useWorkspace((s) => s.breakpoints);
  return useMemo(() => (model ? staticMarkers(model, breakpoints) : []), [model, breakpoints]);
}
/** Static node/line overlays. Future execution clients supply markers, not renderer internals. */
export function OverlayLayer({
  layout,
  fileId,
  transform,
  progress,
  colors,
  markers,
}: {
  layout: StructureLayout;
  fileId: string;
  transform: PlaneTransform;
  progress: SpringValue<number>;
  colors: SceneColors;
  markers?: OverlayMarker[];
}) {
  const defaults = useStaticMarkers(),
    indexes = useOverview((s) => s.indexes),
    owners = useOverview((s) => s.ownerByNode);
  const { visible } = useTileContext(layout, fileId),
    get = useThree((s) => s.get);
  const resolved = useMemo(
    () =>
      resolveMarkers(
        markers ?? defaults,
        layout,
        indexes,
        owners,
        visible.map((e) => e.tile),
      ),
    [markers, defaults, layout, indexes, owners, visible],
  );
  const badges = useMemo(() => new BufferGeometry(), []),
    lines = useMemo(() => new BufferGeometry(), []),
    last = useRef(-1);
  useEffect(
    () => () => {
      badges.dispose();
      lines.dispose();
    },
    [badges, lines],
  );
  useEffect(() => {
    last.current = -1;
    get().invalidate();
  }, [resolved, transform, colors, get]);
  useFrame(() => {
    const t = progress.get();
    if (last.current === t) return;
    last.current = t;
    const points: number[] = [],
      pointColors: number[] = [],
      segments: number[] = [],
      lineColors: number[] = [];
    for (const { marker, tile, x } of resolved) {
      const color = new Color(
        marker.severity === 'error'
          ? colors.error
          : marker.severity === 'warning'
            ? colors.active
            : colors.labelText,
      );
      const world = (x: number, y: number) => {
        const p = new Vector3(...planePoint(x, y, tile.level, tile.lane, layout, transform, t));
        p.y += 0.025 * t;
        p.z += 0.025 * (1 - t);
        return p.toArray();
      };
      if (marker.kind === 'badge') {
        points.push(
          ...world(
            Math.min(tile.x + tile.width - 0.02, Math.max(tile.x + 0.02, x)),
            tile.y + tile.height - 0.08,
          ),
        );
        pointColors.push(color.r, color.g, color.b);
      } else {
        const corners =
          marker.kind === 'cursor'
            ? [world(x, 0.2), world(x, 0.85)]
            : [
                world(tile.x, tile.y),
                world(tile.x + tile.width, tile.y),
                world(tile.x + tile.width, tile.y + tile.height),
                world(tile.x, tile.y + tile.height),
                world(tile.x, tile.y),
              ];
        for (let i = 0; i < corners.length - 1; i++) {
          segments.push(...corners[i], ...corners[i + 1]);
          lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
        if (marker.kind === 'glow')
          for (const delta of [-0.04, 0.04]) {
            for (let i = 0; i < corners.length - 1; i++) {
              segments.push(
                corners[i][0] + delta,
                corners[i][1],
                corners[i][2],
                corners[i + 1][0] + delta,
                corners[i + 1][1],
                corners[i + 1][2],
              );
              lineColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
            }
          }
      }
    }
    for (const [geometry, positions, values] of [
      [badges, points, pointColors],
      [lines, segments, lineColors],
    ] as const) {
      geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
      geometry.setAttribute('color', new BufferAttribute(new Float32Array(values), 3));
      geometry.computeBoundingSphere();
    }
    const data = get().gl.domElement.dataset;
    data.overlayCount = String(resolved.length);
    data.overlayErrors = String(resolved.filter((e) => e.marker.severity === 'error').length);
    data.overlayWarnings = String(resolved.filter((e) => e.marker.severity === 'warning').length);
    data.overlayBreakpoints = String(
      resolved.filter((e) => e.marker.severity === 'breakpoint').length,
    );
  });
  return (
    <>
      <points geometry={badges} raycast={() => {}}>
        <pointsMaterial size={7} sizeAttenuation={false} vertexColors depthWrite={false} />
      </points>
      <lineSegments geometry={lines} raycast={() => {}}>
        <lineBasicMaterial vertexColors transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
    </>
  );
}
