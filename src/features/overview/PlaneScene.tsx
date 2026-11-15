import { useOverview } from './store';
import { usePlaneView } from './plane-view';
import { descendants, rootUp } from './tile-context';
import { TileLabels } from './TileLabels';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';
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
        <span>{lastLine - 1} lines · Flat</span>
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
          >
            {line}
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
  const width = useThree((s) => s.size.width);
  const zoom = Math.max(1, (width - Math.min(140, width * 0.25)) / 36);
  const yScale = Math.max(1, 24 / zoom);
  return (
    <>
      <PlaneCamera
        layout={layout}
        rows={layout.height * yScale}
        fileId={fileId}
        zoom={zoom}
        xScale={xScale}
        yScale={yScale}
        xOffset={xOffset}
      />
      <TileBatch
        layout={layout}
        fileId={fileId}
        xScale={xScale}
        yScale={yScale}
        xOffset={xOffset}
        colors={colors}
      />
      <TileLabels
        layout={layout}
        fileId={fileId}
        xScale={xScale}
        yScale={yScale}
        xOffset={xOffset}
        colors={colors}
      />
      <AxisPositions element={axes} yScale={yScale} />
    </>
  );
}

function AxisPositions({
  element,
  yScale,
}: {
  element: React.RefObject<SVGSVGElement | null>;
  yScale: number;
}) {
  const point = useRef(new Vector3());
  useFrame(({ camera, size }) => {
    for (const text of element.current?.querySelectorAll<SVGTextElement>('[data-world-x]') ?? []) {
      point.current
        .set(Number(text.dataset.worldX), Number(text.dataset.worldY) * yScale, 0)
        .project(camera);
      text.setAttribute('x', String(((point.current.x + 1) * size.width) / 2));
      text.setAttribute('y', String(((1 - point.current.y) * size.height) / 2));
    }
  });
  return null;
}
