import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Mesh, Vector3, type Object3D } from 'three';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { loopGeometry, lowLoopGeometry } from './resources';

export function useDetailLOD<T extends Object3D = Group>(span: number) {
  const ref = useRef<T>(null),
    world = useRef(new Vector3());
  useFrame((state) => {
    const object = ref.current;
    if (!object) return;
    object.getWorldPosition(world.current);
    const viewport = state.viewport.getCurrentViewport(state.camera, world.current);
    object.visible = (span / viewport.height) * state.size.height >= tokens.detailPixels;
    object.traverse((child) => {
      if (object.visible) child.layers.enable(0);
      else child.layers.disable(0);
    });
  });
  return ref;
}
export function useLoopLOD(span: number) {
  const ref = useRef<Mesh>(null),
    world = useRef(new Vector3());
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.getWorldPosition(world.current);
    const viewport = state.viewport.getCurrentViewport(state.camera, world.current);
    mesh.geometry =
      (span / viewport.height) * state.size.height < tokens.detailPixels
        ? lowLoopGeometry
        : loopGeometry;
  });
  return ref;
}
