import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { animated, useSpring } from '@react-spring/three';
import { useThree } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import type { Vec3 } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';

export function FileMotion({ position, children }: { position: Vec3; children: ReactNode }) {
  const previous = useRef<Vec3>(position);
  const reduced = useReducedMotion();
  const get = useThree((state) => state.get);
  const [spring, api] = useSpring(() => ({ x: 0, y: 0, z: 0 }));
  useLayoutEffect(() => {
    const offset = previous.current.map((v, i) => v - position[i]) as Vec3;
    previous.current = position;
    void api.start({
      from: { x: offset[0], y: offset[1], z: offset[2] },
      to: { x: 0, y: 0, z: 0 },
      reset: true,
      immediate: !!reduced,
      config: tokens.layoutSpring,
      onChange: () => get().invalidate(),
    });
    return () => {
      api.stop();
    };
  }, [position, api, reduced, get]);
  return (
    <animated.group position-x={spring.x} position-y={spring.y} position-z={spring.z}>
      {children}
    </animated.group>
  );
}
