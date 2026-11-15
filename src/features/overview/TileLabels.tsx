import { useTileContext } from './tile-context';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera, Vector3 } from 'three';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
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

interface Label {
  tile: StructureTile;
  text: string;
  pixel: number;
  color: string;
}
export function TileLabels({
  layout,
  fileId,
  xScale,
  yScale,
  xOffset,
  colors,
}: {
  layout: StructureLayout;
  fileId: string;
  xScale: number;
  yScale: number;
  xOffset: number;
  colors: SceneColors;
}) {
  use(sceneFontReady);
  assertSceneFont();
  const get = useThree((s) => s.get);
  const indexes = useOverview((s) => s.indexes),
    selected = useOverview((s) => s.selectedNodeId),
    hovered = useOverview((s) => s.hoveredNodeId);
  const enabled = useSettings((s) => s.overviewLabels);
  const { visible, related } = useTileContext(layout, fileId);
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
  }, [candidates, colors, hovered, enabled, xOffset, related, get]);
  useFrame(({ camera, size, gl }) => {
    if (!(camera instanceof OrthographicCamera)) return;
    const scale = Math.max(0.05, 2 ** (Math.floor(Math.log2(camera.zoom * xScale) * 2) / 2));
    if (usePlaneView.getState().pixelsPerUnit !== scale)
      usePlaneView.setState({ pixelsPerUnit: scale });
    const key = `${camera.matrixWorld.elements.join(',')}:${camera.zoom}:${size.width}:${size.height}`;
    if (pose.current === key) return;
    pose.current = key;
    const pixel = 1 / camera.zoom,
      next: Label[] = [],
      bounds = [];
    for (const tile of enabled ? candidates : []) {
      const width = tile.width * xScale * camera.zoom,
        height = tile.height * yScale * camera.zoom;
      const text = tileLabel(tile, indexes?.nodeById.get(tile.nodeIds[0]), width);
      if (!text || height < 16) continue;
      const point = new Vector3(
        tile.x * xScale + xOffset,
        (tile.y + tile.height / 2) * yScale,
        0.02,
      ).project(camera);
      const x = ((point.x + 1) * size.width) / 2,
        y = ((1 - point.y) * size.height) / 2;
      // Only fully visible labels. Geometry remains pickable outside the text LOD.
      if (x < 0 || x + width > size.width || y - height / 2 < 0 || y + height / 2 > size.height)
        continue;
      const active = tile.nodeIds.includes(selected ?? '') || tile.nodeIds.includes(hovered ?? '');
      next.push({
        tile,
        text,
        pixel,
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
        y: y - height / 2 + 1,
        width: width - 8,
        height: height - 2,
        tile: [x, y - height / 2, width, height],
      });
      if (next.length >= tileLabelBudget) break;
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
  return labels.map(({ tile, text, pixel, color }) => (
    <Text
      key={tile.id}
      raycast={() => {}}
      font={sceneFont}
      fontSize={tileLabelPixels * pixel}
      color={color}
      anchorX="left"
      anchorY="middle"
      whiteSpace="nowrap"
      depthOffset={-1}
      position={[tile.x * xScale + xOffset + 4 * pixel, (tile.y + tile.height / 2) * yScale, 0.02]}
      clipRect={[
        0,
        (-tile.height * yScale) / 2 + pixel,
        tile.width * xScale - 8 * pixel,
        (tile.height * yScale) / 2 - pixel,
      ]}
      onSync={() => {
        ready.current.add(tile.id);
        get().gl.domElement.dataset.labelsReady = String(ready.current.size);
        get().invalidate();
      }}
    >
      {text}
      <meshBasicMaterial attach="material" color={color} depthWrite={false} toneMapped={false} />
    </Text>
  ));
}
