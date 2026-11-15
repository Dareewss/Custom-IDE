import type { RefObject, PointerEvent } from 'react';
import { useFrame } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { SpringValue } from '@react-spring/three';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import type { Vec3 } from '../../core/model/layout/types';
import { useWorkspace } from '../explorer/store';
import { panCameraTo, requestCamera } from './camera-actions';
import { planePoint, tilePose, type PlaneTransform } from './plane-transform';
import type { SceneColors } from './scene-tokens';
import { useTileContext } from './tile-context';
interface MapBounds {
  minX: number;
  minY: number;
  scale: number;
  layers: boolean;
  target: Vec3;
  laneHeight: number;
}
export function PlaneMinimap({
  canvas,
  layout,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  layout: StructureLayout;
}) {
  const pan = (event: PointerEvent<HTMLButtonElement>) => {
    const el = canvas.current;
    if (!el?.dataset.bounds) return;
    const b: MapBounds = JSON.parse(el.dataset.bounds),
      box = el.getBoundingClientRect();
    const x = (((event.clientX - box.x) * 180) / box.width - 5) / b.scale + b.minX;
    const y = (((event.clientY - box.y) * 90) / box.height - 5) / b.scale + b.minY;
    if (b.layers) panCameraTo([x, b.target[1], y]);
    else {
      const lane =
        layout.lanes[Math.max(0, Math.min(layout.lanes.length - 1, Math.floor(y / b.laneHeight)))];
      if (lane && lane.fileId !== useWorkspace.getState().active) {
        useWorkspace.getState().open(lane.fileId);
        return;
      }
      panCameraTo([x, -(y - (lane?.index ?? 0) * b.laneHeight), 0]);
    }
  };
  return (
    <button
      type="button"
      className="overview-minimap"
      aria-label="3D minimap"
      title="Click or drag to pan; arrow keys pan; Home fits all"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pan(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) pan(e);
      }}
      onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      onKeyDown={(e) => {
        const action = (
          {
            ArrowLeft: 'pan-left',
            ArrowRight: 'pan-right',
            ArrowUp: 'pan-up',
            ArrowDown: 'pan-down',
            Home: 'fit-all',
            Enter: 'fit-all',
          } as const
        )[e.key as 'Home'];
        if (action) {
          e.preventDefault();
          e.stopPropagation();
          requestCamera(action);
        }
      }}
    >
      <canvas ref={canvas} width={180} height={90} aria-hidden="true" />
      <span>Map</span>
    </button>
  );
}
export function PlaneMapDrawing({
  getCanvas,
  layout,
  transform,
  progress,
  colors,
  fileId,
}: {
  getCanvas: () => HTMLCanvasElement | null;
  layout: StructureLayout;
  transform: PlaneTransform;
  progress: SpringValue<number>;
  colors: SceneColors;
  fileId: string;
}) {
  const { visible } = useTileContext(layout, fileId);
  useFrame(({ camera, controls }) => {
    const el = getCanvas(),
      ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const layers = progress.get() > 0.5,
      laneHeight = layout.height * transform.yScale + 3;
    const map = (p: Vec3, lane: number): [number, number] => [
      p[0],
      layers ? p[2] : -p[1] + lane * laneHeight,
    ];
    const all = layout.lanes.flatMap((lane) => [
      map(planePoint(0, 0, 0, lane.index, layout, transform, progress.get()), lane.index),
      map(
        planePoint(lane.width, -layout.height, 4, lane.index, layout, transform, progress.get()),
        lane.index,
      ),
    ]);
    const minX = Math.min(...all.map((p) => p[0])),
      minY = Math.min(...all.map((p) => p[1])),
      maxX = Math.max(...all.map((p) => p[0])),
      maxY = Math.max(...all.map((p) => p[1]));
    const scale = Math.min(170 / Math.max(1, maxX - minX), 80 / Math.max(1, maxY - minY));
    const project = (p: [number, number]) => [(p[0] - minX) * scale + 5, (p[1] - minY) * scale + 5];
    ctx.clearRect(0, 0, 180, 90);
    ctx.fillStyle = colors.other;
    ctx.globalAlpha = 0.35;
    for (const lane of layout.lanes) {
      const [x, y] = project(all[lane.index * 2]),
        [, bottom] = project(all[lane.index * 2 + 1]);
      ctx.fillRect(
        x,
        y,
        Math.max(1, lane.width * (layers ? transform.layerXScale : transform.xScale) * scale),
        Math.max(2, bottom - y),
      );
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.active;
    for (const { tile } of visible) {
      const pose = tilePose(tile, layout, transform, progress.get()),
        [x, y] = project(map(pose.position, tile.lane));
      ctx.fillRect(x, y, Math.max(1, pose.width * scale), 1);
    }
    const target = (controls as { target?: Vector3 } | null)?.target ?? new Vector3();
    const plane = new Plane(
        layers ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1),
        layers ? -target.y : 0,
      ),
      ray = new Raycaster(),
      polygon: number[][] = [];
    for (const xy of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ray.setFromCamera(new Vector2(...(xy as [number, number])), camera);
      const hit = ray.ray.intersectPlane(plane, new Vector3());
      if (hit) polygon.push(project(map(hit.toArray() as Vec3, transform.activeLane)));
    }
    ctx.strokeStyle = colors.labelText;
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    el.dataset.frustum = JSON.stringify(polygon);
    el.dataset.nodeCount = String(visible.length);
    el.dataset.lanes = String(layout.lanes.length);
    el.dataset.bounds = JSON.stringify({
      minX,
      minY,
      scale,
      layers,
      target: target.toArray(),
      laneHeight,
    } satisfies MapBounds);
  });
  return null;
}
