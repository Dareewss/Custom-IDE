import { ClassBlock, FunctionCapsule, ParameterPort } from './StructureShapes';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { InstancedMesh, Mesh, PerspectiveCamera } from 'three';
import { useReducedMotion } from 'motion/react';
import { useSceneColors, type SceneColors } from './scene-tokens';
import { useOverview } from './store';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { geometryTokens } from '../../core/model/layout/tokens';
import { FileSlab } from './FileSlab';

function Contents({
  model,
  layout,
  colors,
}: {
  model: CodeModel;
  layout: GraphLayout;
  colors: SceneColors;
}) {
  const { get, invalidate } = useThree();
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const selected = useOverview((state) => state.selectedNodeId);
  const hovered = useOverview((state) => state.hoveredNodeId);
  const reducedMotion = useReducedMotion();
  const labeledNodes = new Set(
    model.nodes
      .filter((node) => ['file', 'class', 'function', 'method'].includes(node.kind))
      .sort((a, b) => Number(b.kind === 'file') - Number(a.kind === 'file'))
      .slice(0, geometryTokens.labelBudget)
      .map((node) => node.id),
  );
  useLayoutEffect(() => {
    const { camera, gl } = get();
    if (!(camera instanceof PerspectiveCamera)) return;
    const span = layout.bounds.max.map((value, axis) => value - layout.bounds.min[axis]);
    const center = layout.bounds.max.map((value, axis) => (value + layout.bounds.min[axis]) / 2);
    const distance =
      (Math.max(span[1], span[0] / (width / Math.max(1, height)), 4) /
        (2 * Math.tan((camera.fov * Math.PI) / 360))) *
        1.3 +
      span[2];
    camera.near = Math.max(0.01, distance / 1000);
    camera.far = Math.max(100, distance * 10);
    camera.position.set(center[0], center[1] + distance * 0.1, center[2] + distance);
    camera.lookAt(center[0], center[1], center[2]);
    camera.updateProjectionMatrix();
    controls.current?.target.set(center[0], center[1], center[2]);
    controls.current?.update();
    gl.domElement.dataset.cameraReady = `${Math.round(width)}x${Math.round(height)}`;
    invalidate();
  }, [get, layout, width, height, invalidate]);
  return (
    <>
      <OrbitControls ref={controls} makeDefault enableDamping={!reducedMotion} />
      {model.nodes.map((node) => {
        const item = layout.items[node.id];
        if (!item) return null;
        const active = selected === node.id;
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
              useOverview.setState({ selectedNodeId: node.id });
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              useOverview.setState({ hoveredNodeId: node.id });
            }}
            onPointerOut={() => useOverview.setState({ hoveredNodeId: null })}
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
  const onLost = useCallback(() => setLost(true), []);
  if (lost) return unavailable;
  return (
    <Canvas
      className="code-canvas"
      aria-label="3D code scene"
      frameloop="demand"
      flat
      dpr={[1, 1.5]}
      gl={{ alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 2, 20], fov: 45 }}
      fallback={unavailable}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(0, 0);
        scene.background = null;
        gl.domElement.setAttribute('aria-hidden', 'true');
      }}
    >
      <ContextLoss onLost={onLost} />
      <FrameCounter model={model} />
      <Contents model={model} layout={layout} colors={colors} />
    </Canvas>
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
