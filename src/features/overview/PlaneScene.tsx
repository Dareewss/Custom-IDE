import { useSpring } from '@react-spring/three';
import { useReducedMotion } from 'motion/react';
import { PlaneSheets } from './PlaneSheets';
import { planePoint, type PlaneTransform } from './plane-transform';
import { useOverview } from './store';
import { setPlaneMode, usePlaneView } from './plane-view';
import { descendants, rootUp } from './tile-context';
import { TileLabels } from './TileLabels';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import type { SpringValue } from '@react-spring/three';
import { useFrame, useThree } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { lineToX } from '../../core/model/layout/line-map';
import { useWorkspace } from '../explorer/store';
import { useSceneColors } from './scene-tokens';
import { useOverviewBudget } from './preferences';
import { TileBatch } from './TileBatch';
import { PlaneCamera } from './PlaneCamera';

export default function PlaneScene({
  layout,
  unavailable,
}: {
  layout: StructureLayout;
  unavailable: React.ReactNode;
}) {
  const axes = useRef<SVGSVGElement>(null);
  const active = useWorkspace((s) => s.active);
  const colors = useSceneColors(),
    budget = useOverviewBudget();
  const [lost, setLost] = useState(false);
  const rootId = usePlaneView((s) => s.rootId);
  const mode = usePlaneView((s) => s.mode),
    gap = usePlaneView((s) => s.gap);
  const indexes = useOverview((s) => s.indexes),
    selected = useOverview((s) => s.selectedNodeId);
  const root = rootId ? indexes?.nodeById.get(rootId) : undefined;
  const scopeRect = rootId ? layout.rects[rootId] : undefined;
  useEffect(() => {
    if (
      rootId &&
      (!root ||
        root.fileId !== active ||
        (selected && !descendants(indexes, rootId)?.has(selected)))
    )
      usePlaneView.setState({ rootId: null });
  }, [rootId, root, indexes, selected, active]);
  const breadcrumb = [];
  let ancestor = root;
  while (ancestor && ancestor.kind !== 'file') {
    breadcrumb.unshift(ancestor);
    ancestor = ancestor.parentId ? indexes?.nodeById.get(ancestor.parentId) : undefined;
  }
  const lane = layout.lanes.find((lane) => lane.fileId === active) ?? layout.lanes[0];
  if (lost) return unavailable;
  if (!lane) return <p className="overview-message">No source tiles in this view.</p>;
  const xScale = 32 / Math.max(0.01, scopeRect?.width ?? lane.width);
  const xOffset = -(scopeRect?.x ?? 0) * xScale;
  const lastLine = lane.knots.at(-1)?.line ?? 1;
  const ticks = Array.from({ length: 7 }, (_, i) =>
    Math.max(
      1,
      Math.round(
        (scopeRect?.startLine ?? 1) +
          (((scopeRect?.endLine ?? lastLine) - (scopeRect?.startLine ?? 1) - 1) * i) / 6,
      ),
    ),
  );
  return (
    <div
      className="scene-navigation plane-navigation"
      tabIndex={0}
      role="group"
      aria-label="3D navigation"
      data-scope={rootId ?? ''}
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          !(event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]')
        ) {
          event.preventDefault();
          event.stopPropagation();
          rootUp();
        }
      }}
    >
      <div className="plane-track-header">
        <nav aria-label="Structure breadcrumb">
          <button onClick={() => usePlaneView.setState({ rootId: null })}>{lane.name}</button>
          {breadcrumb.map((node) => (
            <button
              key={node.id}
              aria-current={node.id === rootId ? 'location' : undefined}
              onClick={() => {
                useOverview.setState({ selectedNodeId: node.id });
                usePlaneView.setState({ rootId: node.id });
              }}
            >
              {node.name}
            </button>
          ))}
        </nav>
        <span>{lastLine - 1} lines</span>
        <select
          aria-label="Structure view mode"
          value={mode === 'layers' ? 'layers' : 'flat'}
          onChange={(event) => setPlaneMode(event.target.value === 'layers' ? 'layers' : 'flat')}
        >
          <option value="flat">Flat</option>
          <option value="layers">Layers</option>
        </select>
        {mode === 'layers' && (
          <label className="plane-gap">
            Gap{' '}
            <input
              aria-label="Plane gap"
              type="range"
              min="1"
              max="12"
              step=".5"
              value={gap}
              onChange={(event) => usePlaneView.setState({ gap: Number(event.target.value) })}
            />
            <output>{gap}</output>
          </label>
        )}
      </div>
      <Canvas
        className="code-canvas"
        aria-label="3D code scene"
        frameloop="demand"
        orthographic
        flat
        dpr={[1, budget.dpr]}
        camera={{ position: [14, -3, 100], zoom: 20, near: 0.1, far: 1000 }}
        gl={{
          alpha: true,
          premultipliedAlpha: true,
          antialias: true,
          powerPreference: 'low-power',
        }}
        fallback={unavailable}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0, 0);
          scene.background = null;
          gl.domElement.addEventListener(
            'webglcontextlost',
            (event) => {
              event.preventDefault();
              setLost(true);
            },
            { once: true },
          );
        }}
      >
        <FlatContents
          layout={layout}
          fileId={lane.fileId}
          xScale={xScale}
          xOffset={xOffset}
          colors={colors}
          axes={axes}
        />
      </Canvas>
      <svg ref={axes} className="plane-chrome" aria-label="Source line ruler and levels">
        {layout.planes.map((plane) => (
          <text
            key={`level-${plane.level}`}
            className="plane-row-label"
            textAnchor="end"
            dominantBaseline="middle"
            data-level={plane.level}
            data-lane={lane.index}
            data-world-x={-0.5}
            data-world-y={-plane.firstRow - 0.5}
          >
            L{plane.level} · {plane.name}
          </text>
        ))}
        {[...new Set(ticks)].map((line) => (
          <text
            key={`tick-${line}`}
            className="plane-ruler-tick"
            textAnchor="middle"
            data-world-x={(lineToX(layout, lane.fileId, line) ?? 0) * xScale + xOffset}
            data-world-y={0.2}
            data-level={0}
            data-lane={lane.index}
          >
            {line}
          </text>
        ))}
        {mode === 'layers' &&
          layout.lanes
            .filter((file) => !rootId || file.fileId === lane.fileId)
            .map((file) => (
              <text
                key={file.fileId}
                className="plane-lane-label"
                data-world-x={0}
                data-world-y={0.8}
                data-level={0}
                data-lane={file.index}
              >
                {file.name}
              </text>
            ))}
      </svg>
    </div>
  );
}

function FlatContents({
  layout,
  fileId,
  xScale,
  xOffset,
  colors,
  axes,
}: {
  layout: StructureLayout;
  fileId: string;
  xScale: number;
  xOffset: number;
  colors: ReturnType<typeof useSceneColors>;
  axes: React.RefObject<SVGSVGElement | null>;
}) {
  const width = useThree((s) => s.size.width),
    get = useThree((s) => s.get);
  const zoom = Math.max(1, (width - Math.min(140, width * 0.25)) / 36);
  const yScale = Math.max(1, 24 / zoom);
  const mode = usePlaneView((s) => s.mode),
    gap = usePlaneView((s) => s.gap),
    rootId = usePlaneView((s) => s.rootId);
  const reduced = useReducedMotion();
  const [spring, api] = useSpring(() => ({ t: mode === 'layers' ? 1 : 0 }));
  useLayoutEffect(() => {
    void api.start({
      t: mode === 'layers' ? 1 : 0,
      immediate: !!reduced,
      config: { tension: 160, friction: 28 },
      onChange: () => get().invalidate(),
    });
    return () => {
      api.stop();
    };
  }, [mode, reduced, api, get]);
  const activeLane = layout.lanes.find((lane) => lane.fileId === fileId)?.index ?? 0;
  const layerXScale = rootId ? xScale : 32 / Math.max(1, layout.width);
  const transform = useMemo<PlaneTransform>(
    () => ({
      xScale,
      xOffset,
      yScale,
      layerXScale,
      layerYScale: Math.max(2, yScale),
      gap,
      activeLane,
    }),
    [xScale, xOffset, yScale, layerXScale, gap, activeLane],
  );
  return (
    <>
      <PlaneCamera
        layout={layout}
        fileId={fileId}
        zoom={zoom}
        transform={transform}
        progress={spring.t}
      />
      <PlaneSheets layout={layout} transform={transform} progress={spring.t} color={colors.other} />
      <TileBatch
        layout={layout}
        fileId={fileId}
        transform={transform}
        progress={spring.t}
        colors={colors}
      />
      <TileLabels
        layout={layout}
        fileId={fileId}
        transform={transform}
        progress={spring.t}
        colors={colors}
      />
      <AxisPositions element={axes} transform={transform} layout={layout} progress={spring.t} />
    </>
  );
}

function AxisPositions({
  element,
  transform,
  layout,
  progress,
}: {
  element: React.RefObject<SVGSVGElement | null>;
  transform: PlaneTransform;
  layout: StructureLayout;
  progress: SpringValue<number>;
}) {
  const point = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    const occupied: { x: number; y: number; width: number }[] = [];
    for (const text of element.current?.querySelectorAll<SVGTextElement>('[data-world-x]') ?? []) {
      point.current
        .set(
          ...planePoint(
            (Number(text.dataset.worldX) - transform.xOffset) / transform.xScale,
            Number(text.dataset.worldY),
            Number(text.dataset.level ?? 0),
            Number(text.dataset.lane ?? transform.activeLane),
            layout,
            transform,
            progress.get(),
          ),
        )
        .project(camera);
      text.setAttribute('x', String(((point.current.x + 1) * size.width) / 2));
      text.setAttribute('y', String(((1 - point.current.y) * size.height) / 2));
      const x = ((point.current.x + 1) * size.width) / 2,
        y = ((1 - point.current.y) * size.height) / 2;
      const w = (text.textContent?.length ?? 0) * 6.2,
        anchor = text.getAttribute('text-anchor');
      const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
      const hidden =
        Math.abs(point.current.x) > 1 ||
        Math.abs(point.current.y) > 1 ||
        Math.abs(point.current.z) > 1 ||
        occupied.some(
          (b) =>
            left < b.x + b.width + 2 && left + w > b.x - 2 && y - 7 < b.y + 7 && y + 7 > b.y - 7,
        );
      text.style.visibility = hidden ? 'hidden' : 'visible';
      if (!hidden) occupied.push({ x: left, y, width: w });
    }
  });
  return null;
}
