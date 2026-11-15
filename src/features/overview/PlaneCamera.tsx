import { useLayoutEffect, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MOUSE, OrthographicCamera } from 'three';

export function PlaneCamera({
  rows,
  fileId,
  zoom,
}: {
  rows: number;
  fileId: string;
  zoom: number;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const get = useThree((s) => s.get),
    width = useThree((s) => s.size.width),
    height = useThree((s) => s.size.height);
  useLayoutEffect(() => {
    const { camera, invalidate } = get();
    if (!(camera instanceof OrthographicCamera)) return;
    const target = [14, -rows / 2, 0] as const;
    camera.position.set(target[0], target[1], 100);
    camera.zoom = zoom;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    controls.current?.target.set(...target);
    controls.current?.update();
    invalidate();
  }, [get, width, height, rows, fileId, zoom]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate={false}
      enableDamping={false}
      minZoom={0.5}
      maxZoom={500}
      mouseButtons={{ LEFT: MOUSE.PAN, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
    />
  );
}
