import { use, useCallback, useEffect, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { sceneLabel } from './label-text';
import type { SceneColors } from './scene-tokens';
import { sceneFont, sceneFontReady, assertSceneFont } from './scene-font';

export function SceneLabel({
  name,
  width,
  colors,
  position,
}: {
  name: string;
  width: number;
  colors: SceneColors;
  position: [number, number, number];
}) {
  use(sceneFontReady);
  assertSceneFont();
  const group = useRef<Group>(null);
  const ready = useRef(false);
  const alive = useRef(true);
  const point = useRef(new Vector3());
  const get = useThree((state) => state.get);
  const maxChars = Math.max(
    4,
    Math.floor((width - tokens.labelPadding * 2) / (tokens.labelSize * tokens.labelAdvance)),
  );
  const text = sceneLabel(name, Math.min(tokens.labelMaxCharacters, maxChars));
  const labelWidth = text.length * tokens.labelSize * tokens.labelAdvance + tokens.labelPadding * 2;
  useFrame((state) => {
    if (!group.current) return;
    group.current.getWorldPosition(point.current);
    const viewport = state.viewport.getCurrentViewport(state.camera, point.current);
    const scale = Math.max(
      1,
      ((viewport.height / state.size.height) * tokens.labelMinPixels) / tokens.labelSize,
    );
    group.current.scale.setScalar(scale);
  });
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
        <mesh renderOrder={10000}>
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
          font={sceneFont}
          characters={text}
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
