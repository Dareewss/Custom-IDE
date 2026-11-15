import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { SpringValue } from '@react-spring/three';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Vector3 } from 'three';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { useOverview } from './store';
import { usePlaneView } from './plane-view';
import { useTileContext } from './tile-context';
import { tileConnections, connectionPoints } from './plane-edges';
import type { PlaneTransform } from './plane-transform';
import type { SceneColors } from './scene-tokens';
import { useSettings } from '../settings/store';

export function PlaneEdges({
  layout,
  fileId,
  transform,
  progress,
  colors,
}: {
  layout: StructureLayout;
  fileId: string;
  transform: PlaneTransform;
  progress: SpringValue<number>;
  colors: SceneColors;
}) {
  const model = useOverview((s) => s.model),
    owners = useOverview((s) => s.ownerByNode),
    selected = useOverview((s) => s.selectedNodeId),
    hovered = useOverview((s) => s.hoveredNodeId);
  const mode = usePlaneView((s) => s.edges),
    imports = usePlaneView((s) => s.imports);
  const enabled = useSettings((s) => s.overviewEdges);
  const { visible } = useTileContext(layout, fileId);
  const routes = useMemo(
    () =>
      model
        ? tileConnections(
            model,
            visible.map((e) => e.tile),
            owners,
            enabled ? mode : 'none',
            enabled && imports,
            hovered ?? selected,
          )
        : { connections: [], hidden: 0 },
    [model, visible, owners, enabled, mode, imports, hovered, selected],
  );
  const geometry = useMemo(() => new BufferGeometry(), []),
    last = useRef(-1),
    get = useThree((s) => s.get);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    last.current = -1;
    get().invalidate();
  }, [routes, transform, colors, get]);
  useFrame(() => {
    const t = progress.get();
    if (last.current === t) return;
    last.current = t;
    const positions: number[] = [],
      values: number[] = [];
    for (const edge of routes.connections) {
      const points = connectionPoints(edge, layout, transform, t).map((p) => new Vector3(...p));
      const color = new Color(edge.kind === 'import' ? colors.other : colors.functionFill);
      const width = edge.kind === 'import' ? 0.025 * Math.min(5, Math.sqrt(edge.count)) : 0.012;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1],
          n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.12));
        for (let j = 0; j < n; j++) {
          if (edge.unresolved && j % 4 >= 2) continue;
          const start = a.clone().lerp(b, j / n),
            end = a.clone().lerp(b, (j + 1) / n);
          const side = end
            .clone()
            .sub(start)
            .cross(get().camera.position.clone().sub(start))
            .normalize()
            .multiplyScalar(width);
          const q = [
            start.clone().add(side),
            start.clone().sub(side),
            end.clone().add(side),
            end.clone().add(side),
            start.clone().sub(side),
            end.clone().sub(side),
          ];
          for (const p of q) {
            positions.push(...p.toArray());
            values.push(color.r, color.g, color.b);
          }
        }
      }
    }
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(values), 3));
    geometry.computeBoundingSphere();
    const data = get().gl.domElement.dataset;
    data.tileEdges = String(routes.connections.length);
    data.hiddenEdges = String(routes.hidden);
    if (usePlaneView.getState().hiddenEdges !== routes.hidden)
      usePlaneView.setState({ hiddenEdges: routes.hidden });
    data.dashedEdgeCount = String(routes.connections.filter((e) => e.unresolved).length);
    data.importBands = JSON.stringify(
      routes.connections
        .filter((e) => e.kind === 'import')
        .map((e) => ({ count: e.count, from: e.from.fileId, to: e.to?.fileId ?? null })),
    );
  });
  return (
    <mesh geometry={geometry} raycast={() => {}}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.7}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
