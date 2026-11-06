import { useSettings } from '../settings/store';
import type { ComponentProps } from 'react';
import { labelRegistry } from './LabelCulling';
import { visibleMeshRaycast } from './resources';
import { use, useCallback, useEffect, useRef, useId } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { sceneLabel } from './label-text';
import type { SceneColors } from './scene-tokens';
import { sceneFont, sceneFontReady, assertSceneFont } from './scene-font';

function VisibleSceneLabel({
  name,
  width,
  colors,
  position,
  nodeId,
  priority = 4,
}: {
  name: string;
  width: number;
  colors: SceneColors;
  position: [number, number, number];
  nodeId?: string;
  priority?: number;
}) {
  use(sceneFontReady);
  assertSceneFont();
  const group = useRef<Group>(null);
  const ready = useRef(false);
  const alive = useRef(true);
  const point = useRef(new Vector3());
  const parentScale = useRef(new Vector3(1, 1, 1));
  const get = useThree((state) => state.get);
  const viewportWidth = useThree((state) => state.size.width);
  const id = useId();
  const maxChars = Math.max(
    4,
    Math.floor((width - tokens.labelPadding * 2) / (tokens.labelSize * tokens.labelAdvance)),
  );
  const text = sceneLabel(
    name,
    Math.max(
      4,
      Math.min(
        tokens.labelMaxCharacters,
        maxChars,
        Math.floor((viewportWidth * 0.8) / (tokens.labelMaxPixels * tokens.labelAdvance)),
      ),
    ),
  );
  const labelWidth = text.length * tokens.labelSize * tokens.labelAdvance + tokens.labelPadding * 2;
  useFrame((state) => {
    if (!group.current) return;
    group.current.getWorldPosition(point.current);
    const viewport = state.viewport.getCurrentViewport(state.camera, point.current);
    group.current.parent?.getWorldScale(parentScale.current);
    const fontPixels =
      (tokens.labelSize / Math.max(1e-6, viewport.height)) *
      state.size.height *
      Math.max(1e-6, Math.abs(parentScale.current.x));
    const scale =
      Math.max(tokens.labelMinPixels, Math.min(tokens.labelMaxPixels, fontPixels)) / fontPixels;
    group.current.scale.setScalar(scale);
  });
  useEffect(() => {
    const registry = labelRegistry(get().gl.domElement);
    registry.set(id, {
      get: () => group.current,
      width: labelWidth,
      height: tokens.labelSize + tokens.labelPadding * 2,
      nodeId,
      priority,
    });
    get().invalidate();
    return () => {
      registry.delete(id);
    };
  }, [get, id, labelWidth, nodeId, priority]);
  const onSync = useCallback(() => {
    if (!alive.current) return;
    const { gl, invalidate } = get();
    if (!ready.current) {
      ready.current = true;
      gl.domElement.dataset.labelsReady = String(
        Number(gl.domElement.dataset.labelsReady ?? 0) + 1,
      );
    }
    invalidate();
  }, [get]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (ready.current) {
        const canvas = get().gl.domElement;
        canvas.dataset.labelsReady = String(
          Math.max(0, Number(canvas.dataset.labelsReady ?? 0) - 1),
        );
        ready.current = false;
      }
    };
  }, [get]);
  return (
    <group position={position} ref={group}>
      <Billboard>
        <mesh renderOrder={10000} raycast={visibleMeshRaycast}>
          <planeGeometry args={[labelWidth, tokens.labelSize + tokens.labelPadding * 2]} />
          <meshBasicMaterial
            color={colors.labelBacking}
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <Text
          raycast={() => {}}
          font={sceneFont}
          fontSize={tokens.labelSize}
          color={colors.labelText}
          anchorX="center"
          anchorY="middle"
          outlineColor={colors.labelBacking}
          outlineWidth={tokens.labelOutline}
          outlineOpacity={1}
          fillOpacity={1}
          renderOrder={10001}
          position={[0, 0, tokens.labelDepth]}
          onSync={onSync}
          material-depthTest={false}
          material-depthWrite={false}
          material-opacity={1}
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
}

export function SceneLabel(props: ComponentProps<typeof VisibleSceneLabel>) {
  const labels = useSettings((state) => state.overviewLabels);
  return labels ? <VisibleSceneLabel {...props} /> : null;
}
