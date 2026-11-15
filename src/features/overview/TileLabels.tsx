import { use, useEffect, useMemo, useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { SpringValue } from '@react-spring/three';
import { Group, Vector3 } from 'three';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import type { Vec3 } from '../../core/model/layout/types';
import type { SceneColors } from './scene-tokens';
import { useOverview } from './store';
import { useSettings } from '../settings/store';
import { sceneFont, sceneFontReady, assertSceneFont } from './scene-font';
import {
  tileColor,
  tileTextColor,
  tileLabel,
  tileLabelPixels,
  tileLabelBudget,
} from './tile-labels';
import { usePlaneView } from './plane-view';
import { useTileContext } from './tile-context';
import { tilePose, screenPoint, type PlaneTransform } from './plane-transform';
interface Label {
  tile: StructureTile;
  text: string;
  fontSize: number;
  scaleX: number;
  position: Vec3;
  angle: number;
  clip: [number, number, number, number];
  color: string;
}
export function TileLabels({
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
  use(sceneFontReady);
  assertSceneFont();
  const get = useThree((s) => s.get),
    group = useRef<Group>(null);
  const indexes = useOverview((s) => s.indexes),
    selected = useOverview((s) => s.selectedNodeId),
    hovered = useOverview((s) => s.hoveredNodeId);
  const enabled = useSettings((s) => s.overviewLabels),
    { visible, related } = useTileContext(layout, fileId);
  const candidates = useMemo(
    () =>
      visible
        .map((entry) => entry.tile)
        .sort(
          (a, b) =>
            Number(b.nodeIds.includes(selected ?? '')) -
              Number(a.nodeIds.includes(selected ?? '')) ||
            a.level - b.level ||
            a.x - b.x,
        ),
    [visible, selected],
  );
  const [labels, setLabels] = useState<Label[]>([]);
  const pose = useRef(''),
    ready = useRef(new Set<string>());
  useEffect(() => {
    pose.current = '';
    get().invalidate();
  }, [candidates, colors, hovered, enabled, transform, related, get]);
  useFrame(({ camera, size, gl }) => {
    if (group.current) group.current.visible = progress.idle;
    if (!progress.idle) {
      pose.current = '';
      return;
    }
    const t = progress.get(),
      key = `${camera.matrixWorld.elements.join(',')}:${camera.projectionMatrix.elements.join(',')}:${size.width}:${size.height}:${t}`;
    if (pose.current === key) return;
    pose.current = key;
    const next: Label[] = [],
      bounds: {
        id: string;
        text: string;
        fontPixels: number;
        x: number;
        y: number;
        width: number;
        height: number;
        tile: number[];
      }[] = [];
    const activeTile =
      candidates.find((tile) => tile.fileId === fileId && tile.level === 0) ??
      candidates.find((tile) => tile.fileId === fileId);
    let sourceScale = 0;
    if (activeTile) {
      const p = tilePose(activeTile, layout, transform, t),
        c = screenPoint(p.position, camera, size.width, size.height),
        u = screenPoint(
          [p.position[0] + 1, p.position[1], p.position[2]],
          camera,
          size.width,
          size.height,
        );
      sourceScale =
        Math.hypot(u[0] - c[0], u[1] - c[1]) *
        ((1 - t) * transform.xScale + t * transform.layerXScale);
    }
    for (const tile of enabled ? candidates : []) {
      const p = tilePose(tile, layout, transform, t),
        center = new Vector3(...p.position),
        up = new Vector3(0, Math.cos(p.angle), Math.sin(p.angle)),
        normal = new Vector3(0, -Math.sin(p.angle), Math.cos(p.angle));
      const screen = (v: Vector3) => screenPoint(v.toArray(), camera, size.width, size.height);
      const c = screen(center),
        u = screen(center.clone().add(new Vector3(1, 0, 0))),
        v = screen(center.clone().add(up));
      const unitX = Math.hypot(u[0] - c[0], u[1] - c[1]),
        unitY = Math.hypot(v[0] - c[0], v[1] - c[1]);
      const width = p.width * unitX,
        height = p.height * unitY,
        text = tileLabel(tile, indexes?.nodeById.get(tile.nodeIds[0]), width);
      if (!text || height < 16 || c[2] < -1 || c[2] > 1) continue;
      const corners = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([x, y]) =>
        screen(
          center
            .clone()
            .add(new Vector3((x * p.width) / 2, 0, 0))
            .addScaledVector(up, (y * p.height) / 2),
        ),
      );
      const x = Math.min(...corners.map((v) => v[0])),
        y = Math.min(...corners.map((v) => v[1]));
      const w = Math.max(...corners.map((v) => v[0])) - x,
        h = Math.max(...corners.map((v) => v[1])) - y;
      if (x < 0 || x + w > size.width || y < 0 || y + h > size.height) continue;
      if (
        bounds.some(
          (b) =>
            x + 4 < b.x + b.width && x + w - 4 > b.x && y + 1 < b.y + b.height && y + h - 1 > b.y,
        )
      )
        continue;
      const active = tile.nodeIds.includes(selected ?? '') || tile.nodeIds.includes(hovered ?? ''),
        scaleX = unitY / unitX;
      next.push({
        tile,
        text,
        fontSize: tileLabelPixels / unitY,
        scaleX,
        position: center
          .add(new Vector3(-p.width / 2 + 4 / unitX, 0, 0))
          .addScaledVector(normal, 0.02)
          .toArray(),
        angle: p.angle,
        clip: [
          0,
          -p.height / 2 + 1 / unitY,
          (p.width - 8 / unitX) / scaleX,
          p.height / 2 - 1 / unitY,
        ],
        color: tileTextColor(
          tileColor(
            tile.level,
            colors,
            active,
            !!related && !tile.nodeIds.some((id) => related.has(id)),
          ),
        ),
      });
      bounds.push({
        id: tile.id,
        text,
        fontPixels: tileLabelPixels,
        x: x + 4,
        y: y + 1,
        width: w - 8,
        height: h - 2,
        tile: [x, y, w, h],
      });
      if (next.length >= tileLabelBudget) break;
    }
    // Use the active lane's actual projection for worker aggregation, including perspective zoom.
    if (sourceScale > 0) {
      const scale = Math.min(
        1024,
        Math.max(0.05, 2 ** (Math.floor(Math.log2(sourceScale) * 2) / 2)),
      );
      if (usePlaneView.getState().pixelsPerUnit !== scale)
        usePlaneView.setState({ pixelsPerUnit: scale });
    }
    gl.domElement.dataset.tileLabelBounds = JSON.stringify(bounds);
    gl.domElement.dataset.tileLabelBudget = String(tileLabelBudget);
    gl.domElement.dataset.tileLabels = String(next.length);
    setLabels(next);
  });
  useEffect(() => {
    const current = new Set(labels.map((label) => label.tile.id));
    for (const id of ready.current) if (!current.has(id)) ready.current.delete(id);
    get().gl.domElement.dataset.labelsReady = String(ready.current.size);
  }, [labels, get]);
  return (
    <group ref={group}>
      {labels.map((label) => (
        <Text
          key={label.tile.id}
          raycast={() => {}}
          font={sceneFont}
          fontSize={label.fontSize}
          color={label.color}
          anchorX="left"
          anchorY="middle"
          whiteSpace="nowrap"
          depthOffset={-1}
          position={label.position}
          rotation={[label.angle, 0, 0]}
          scale={[label.scaleX, 1, 1]}
          clipRect={label.clip}
          onSync={() => {
            ready.current.add(label.tile.id);
            get().gl.domElement.dataset.labelsReady = String(ready.current.size);
            get().invalidate();
          }}
        >
          {label.text}
          <meshBasicMaterial
            attach="material"
            color={label.color}
            depthWrite={false}
            toneMapped={false}
          />
        </Text>
      ))}
    </group>
  );
}
