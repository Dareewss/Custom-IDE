import { CameraRig } from './CameraRig';
import { CameraTools } from './CameraTools';
import { cameraKey, requestCamera } from './camera-actions';
import { FileMotion } from './FileMotion';
import { ClassBlock, FunctionCapsule, ParameterPort } from './StructureShapes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Mesh } from 'three';
import { useSceneColors, type SceneColors } from './scene-tokens';
import { useOverview } from './store';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { geometryTokens } from '../../core/model/layout/tokens';
import { FileSlab } from './FileSlab';
import { CollectionShape } from './CollectionShape';
import { ValueInstances } from './ValueInstances';
import { valueInstances } from './value-instances';
import { selectOverviewNode, setOverviewHover } from './selection';
import { ControlFlowShape } from './ControlFlowShapes';
import { GraphEdges } from './GraphEdges';
import { ExternalShapes } from './ExternalShapes';

function Contents({
  model,
  layout,
  colors,
}: {
  model: CodeModel;
  layout: GraphLayout;
  colors: SceneColors;
}) {
  const selected = useOverview((state) => state.selectedNodeId);
  const hovered = useOverview((state) => state.hoveredNodeId);
  const groups = useMemo(() => {
    const values = valueInstances(model, layout);
    const groups = new Map<
      string,
      {
        id: string;
        nodes: CodeModel['nodes'];
        variables: typeof values.variables;
        cells: typeof values.cells;
      }
    >();
    for (const node of model.nodes)
      if (node.kind === 'file')
        groups.set(node.fileId, { id: node.id, nodes: [], variables: [], cells: [] });
    for (const node of model.nodes) if (node.fileId) groups.get(node.fileId)?.nodes.push(node);
    for (const variable of values.variables)
      if (variable.node.fileId) groups.get(variable.node.fileId)?.variables.push(variable);
    for (const cell of values.cells)
      if (cell.node.fileId) groups.get(cell.node.fileId)?.cells.push(cell);
    return [...groups.values()];
  }, [model, layout]);
  const labeledNodes = new Set(
    model.nodes
      .filter((node) =>
        ['file', 'class', 'function', 'method', 'collection', 'loop', 'condition'].includes(
          node.kind,
        ),
      )
      .sort((a, b) => Number(b.kind === 'file') - Number(a.kind === 'file'))
      .slice(0, geometryTokens.labelBudget)
      .map((node) => node.id),
  );
  return (
    <>
      <CameraRig layout={layout} />
      <ambientLight intensity={geometryTokens.ambientLight} />
      <directionalLight
        position={geometryTokens.lightPosition}
        intensity={geometryTokens.directionalLight}
      />
      <GraphEdges model={model} layout={layout} colors={colors} />
      <ExternalShapes model={model} layout={layout} colors={colors} />
      {groups.map((group) => (
        <FileMotion key={group.id} position={layout.items[group.id].position}>
          <ValueInstances instances={group.variables} shape="sphere" colors={colors} />
          <ValueInstances instances={group.cells} shape="cell" colors={colors} />
          {group.nodes.map((node) => {
            if (node.kind === 'external') return null;
            const item = layout.items[node.id];
            if (!item) return null;
            const active = selected === node.id;
            if (node.kind === 'loop' || node.kind === 'condition')
              return (
                <ControlFlowShape
                  key={node.id}
                  node={node}
                  item={item}
                  colors={colors}
                  label={labeledNodes.has(node.id)}
                  lanes={layout.branches[node.id]}
                />
              );
            if (node.kind === 'class')
              return (
                <ClassBlock
                  key={node.id}
                  node={node}
                  item={item}
                  colors={colors}
                  label={labeledNodes.has(node.id)}
                />
              );
            if (node.kind === 'function' || node.kind === 'method')
              return (
                <FunctionCapsule
                  key={node.id}
                  node={node}
                  item={item}
                  colors={colors}
                  label={labeledNodes.has(node.id)}
                />
              );
            if (node.meta.role === 'parameter')
              return <ParameterPort key={node.id} node={node} item={item} colors={colors} />;
            if (node.kind === 'variable') return null;
            if (node.kind === 'collection')
              return (
                <CollectionShape
                  key={node.id}
                  node={node}
                  item={item}
                  colors={colors}
                  label={labeledNodes.has(node.id)}
                />
              );
            if (node.kind === 'file')
              return (
                <FileSlab
                  key={node.id}
                  node={node}
                  item={item}
                  colors={colors}
                  label={labeledNodes.has(node.id)}
                />
              );
            return (
              <mesh
                key={node.id}
                position={item.position}
                onClick={(event) => {
                  event.stopPropagation();
                  selectOverviewNode(node);
                }}
                onPointerOver={(event) => {
                  event.stopPropagation();
                  setOverviewHover(node.id);
                }}
                onPointerOut={() => setOverviewHover(null)}
              >
                <boxGeometry args={item.size} />
                <meshBasicMaterial
                  color={active ? colors.active : hovered === node.id ? colors.hover : colors.fill}
                  transparent
                  opacity={
                    active
                      ? colors.activeOpacity
                      : node.children.length
                        ? colors.containerOpacity
                        : colors.nodeOpacity
                  }
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </FileMotion>
      ))}
    </>
  );
}

export default function CodeScene({
  model,
  layout,
  unavailable,
}: {
  model: CodeModel;
  layout: GraphLayout;
  unavailable: React.ReactNode;
}) {
  const colors = useSceneColors();
  const [lost, setLost] = useState(false);
  const [ready, setReady] = useState(false);
  const onLost = useCallback(() => setLost(true), []);
  if (lost) return unavailable;
  return (
    <div
      className="scene-navigation"
      tabIndex={0}
      role="group"
      aria-label="3D navigation"
      aria-describedby="camera-help"
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const action = cameraKey(event.key, event.shiftKey);
        if (action) {
          event.preventDefault();
          requestCamera(action);
        }
      }}
    >
      <span id="camera-help" className="sr-only">
        Arrow keys orbit. Shift and arrows pan. Plus and minus zoom. F fits selection. Home fits
        all. R resets. Drag to orbit, right drag to pan, scroll or pinch to zoom.
      </span>
      {ready && <CameraTools />}
      <Canvas
        className="code-canvas"
        aria-label="3D code scene"
        frameloop="demand"
        flat
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          premultipliedAlpha: true,
          antialias: true,
          powerPreference: 'low-power',
        }}
        camera={{ position: [0, 2, 20], fov: 45 }}
        fallback={unavailable}
        onCreated={({ gl, scene, raycaster }) => {
          setReady(true);
          raycaster.params.Line.threshold = geometryTokens.edgePickThreshold;
          gl.setClearColor(0, 0);
          scene.background = null;
          gl.domElement.setAttribute('aria-hidden', 'true');
        }}
      >
        <ContextLoss onLost={onLost} />
        <FrameCounter model={model} />
        <Contents model={model} layout={layout} colors={colors} />
      </Canvas>
    </div>
  );
}

function FrameCounter({ model }: { model: CodeModel }) {
  const frames = useRef(0);
  const measured = useRef<{ model: CodeModel; labels: string } | null>(null);
  useFrame(({ gl, scene }) => {
    gl.domElement.dataset.renderFrames = String(++frames.current);
    const labels = gl.domElement.dataset.labelsReady ?? '0';
    if (measured.current?.model !== model || measured.current.labels !== labels) {
      const counts: Record<string, number> = {};
      scene.traverse((object) => {
        if (object instanceof Mesh)
          counts[object.geometry.type] =
            (counts[object.geometry.type] ?? 0) +
            (object instanceof InstancedMesh ? object.count : 1);
      });
      gl.domElement.dataset.geometryCounts = JSON.stringify(counts);
      measured.current = { model, labels };
    }
  });
  return null;
}

function ContextLoss({ onLost }: { onLost: () => void }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const canvas = get().gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [get, onLost]);
  return null;
}
