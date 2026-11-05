import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { animated, useSpring } from '@react-spring/three';
import { useThree } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import type { CodeNode } from '../../core/model/types';
import type { LayoutItem, Vec3 } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { headerPosition } from '../../core/model/layout/metrics';

export function NodeMotion({
  node,
  item,
  root,
  added,
  children,
}: {
  node: CodeNode;
  item: LayoutItem;
  root: Vec3;
  added: boolean;
  children: ReactNode;
}) {
  const anchor = useMemo(
    () =>
      ['function', 'method', 'condition'].includes(node.kind)
        ? headerPosition(item)
        : item.position,
    [node.kind, item],
  );
  const previous = useRef<{ anchor: Vec3; root: Vec3 } | null>(null);
  const get = useThree((s) => s.get),
    reduced = useReducedMotion();
  const [spring, api] = useSpring(() => ({ x: 0, y: 0, z: 0, scale: 1 }));
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { anchor, root };
    const delta = anchor.map((_, i) =>
      before ? before.anchor[i] - anchor[i] - (before.root[i] - root[i]) : 0,
    );
    void api.start({
      from: {
        x: delta[0],
        y: delta[1],
        z: delta[2],
        scale: !before && added ? tokens.enterScale : 1,
      },
      to: { x: 0, y: 0, z: 0, scale: 1 },
      reset: true,
      immediate: !!reduced,
      config: { duration: tokens.updateDuration },
      onChange: () => get().invalidate(),
    });
    return () => {
      api.stop();
    };
  }, [anchor, root, added, api, get, reduced]);
  return (
    <animated.group
      position-x={spring.x.to((x) => anchor[0] + x)}
      position-y={spring.y.to((y) => anchor[1] + y)}
      position-z={spring.z.to((z) => anchor[2] + z)}
      scale={spring.scale}
    >
      <group position={[-anchor[0], -anchor[1], -anchor[2]]}>{children}</group>
    </animated.group>
  );
}
