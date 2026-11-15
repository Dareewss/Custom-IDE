import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { SpringValue } from '@react-spring/three';
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { planePoint, type PlaneTransform } from './plane-transform';

export function PlaneSheets({
  layout,
  transform,
  progress,
  color,
}: {
  layout: StructureLayout;
  transform: PlaneTransform;
  progress: SpringValue<number>;
  color: string;
}) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(layout.lanes.length * 5 * 6 * 3), 3),
    );
    return g;
  }, [layout.lanes.length]);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
      }),
    [color],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const previous = useRef(-1),
    mesh = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null);
  useEffect(() => {
    previous.current = -1;
  }, [layout, transform]);
  useFrame(() => {
    const t = progress.get();
    if (previous.current === t) return;
    previous.current = t;
    if (mesh.current) mesh.current.material.opacity = 0.065 * t;
    const attribute = geometry.getAttribute('position');
    let index = 0;
    for (const lane of layout.lanes)
      for (const plane of layout.planes) {
        const top = -plane.firstRow + 0.15,
          bottom = -plane.firstRow - plane.rows - 0.15;
        for (const [x, y] of [
          [-0.3, top],
          [lane.width + 0.3, top],
          [-0.3, bottom],
          [lane.width + 0.3, top],
          [lane.width + 0.3, bottom],
          [-0.3, bottom],
        ]) {
          const p = planePoint(x, y, plane.level, lane.index, layout, transform, t);
          attribute.setXYZ(index++, p[0], p[1] - 0.012 * t, p[2] - 0.012 * (1 - t));
        }
      }
    attribute.needsUpdate = true;
    geometry.computeBoundingSphere();
  });
  return (
    <mesh
      ref={mesh}
      name="level-sheets"
      geometry={geometry}
      material={material}
      raycast={() => {}}
    />
  );
}
