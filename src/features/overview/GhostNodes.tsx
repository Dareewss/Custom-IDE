import { useEffect, useLayoutEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import { useThree } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { functionWidth, headerPosition } from '../../core/model/layout/metrics';
import { useOverview } from './store';
import type { SceneColors } from './scene-tokens';

export function GhostNodes({ colors }: { colors: SceneColors }) {
  const ghosts = useOverview((s) => s.ghosts),
    revision = useOverview((s) => s.modelRevision);
  const get = useThree((s) => s.get),
    reduced = useReducedMotion();
  const [spring, api] = useSpring(() => ({ opacity: 0 }));
  useLayoutEffect(() => {
    if (!ghosts.length) return;
    void api.start({
      from: { opacity: tokens.ghostOpacity },
      to: { opacity: 0 },
      reset: true,
      immediate: !!reduced,
      config: { duration: tokens.updateDuration },
      onChange: () => get().invalidate(),
    });
    return () => {
      api.stop();
    };
  }, [ghosts, reduced, api, get]);
  useEffect(() => {
    if (!ghosts.length) return;
    const timer = setTimeout(
      () => {
        if (useOverview.getState().modelRevision === revision) useOverview.setState({ ghosts: [] });
      },
      reduced ? 0 : tokens.updateDuration + 40,
    );
    return () => clearTimeout(timer);
  }, [ghosts, revision, reduced]);
  return (
    <group name="removed-code-ghosts">
      {ghosts.map(({ node, item, cells }) => {
        const material = (
          <animated.meshBasicMaterial
            color={colors.fill}
            transparent
            opacity={spring.opacity}
            depthWrite={false}
          />
        );
        if (node.kind === 'collection' && cells.length)
          return (
            <group key={node.id}>
              {cells.map((cell) => (
                <mesh
                  key={`${cell.part}:${cell.index}`}
                  position={cell.position}
                  raycast={() => {}}
                >
                  <boxGeometry args={[tokens.cellWidth, tokens.cellHeight, tokens.cellDepth]} />
                  {material}
                </mesh>
              ))}
            </group>
          );
        return (
          <mesh
            key={node.id}
            position={
              node.kind === 'function' || node.kind === 'method' || node.kind === 'condition'
                ? headerPosition(item)
                : item.position
            }
            rotation={
              node.kind === 'function' || node.kind === 'method' ? [0, 0, Math.PI / 2] : [0, 0, 0]
            }
            scale={node.kind === 'loop' ? [item.size[0] / 2, item.size[1] / 2, 1] : [1, 1, 1]}
            raycast={() => {}}
          >
            {node.kind === 'variable' ? (
              <sphereGeometry
                args={[
                  node.meta.role === 'parameter' ? tokens.portRadius : tokens.variableRadius,
                  tokens.variableSegments,
                  tokens.variableSegments,
                ]}
              />
            ) : node.kind === 'function' || node.kind === 'method' ? (
              <capsuleGeometry
                args={[
                  tokens.functionRadius,
                  functionWidth(node, node.meta.params?.length ?? 0) - tokens.functionRadius * 2,
                  tokens.functionCapSegments,
                  tokens.functionRadialSegments,
                ]}
              />
            ) : node.kind === 'loop' ? (
              <torusGeometry
                args={[1, tokens.loopTube, tokens.loopRadialSegments, tokens.loopTubularSegments]}
              />
            ) : node.kind === 'condition' ? (
              <octahedronGeometry args={[tokens.conditionRadius, 0]} />
            ) : (
              <boxGeometry args={item.size} />
            )}
            {material}
          </mesh>
        );
      })}
    </group>
  );
}
