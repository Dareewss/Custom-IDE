import { useCallback, useEffect, useLayoutEffect, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import { useReducedMotion } from 'motion/react';
import type { GraphLayout, Vec3 } from '../../core/model/layout/types';
import { fitCamera, itemBounds, type Bounds } from './camera-math';
import { useOverview } from './store';

export function CameraRig({ layout }: { layout: GraphLayout }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const get = useThree((s) => s.get),
    width = useThree((s) => s.size.width),
    height = useThree((s) => s.size.height);
  const reduced = useReducedMotion();
  const request = useOverview((s) => s.cameraRequest),
    focus = useOverview((s) => s.focusRequest);
  const initialized = useRef(false),
    processed = useRef(request?.sequence ?? 0),
    focused = useRef(0);
  const motion = useRef<{ position: Vector3; target: Vector3 } | null>(null);
  const fittedSize = useRef('');
  const fitMode = useRef<'all' | 'selection' | null>('all');
  useEffect(() => () => get().setEvents({ enabled: true }), [get]);
  const apply = useCallback(
    (position: Vector3, target: Vector3) => {
      const { camera } = get();
      camera.position.copy(position);
      camera.lookAt(target);
      if (controls.current) {
        controls.current.target.copy(target);
        controls.current.update();
      }
    },
    [get],
  );
  const move = useCallback(
    (position: Vec3, target: Vec3, instant = false) => {
      const { gl, invalidate } = get();
      const to = { position: new Vector3(...position), target: new Vector3(...target) };
      if (reduced || instant) {
        motion.current = null;
        apply(to.position, to.target);
        gl.domElement.dataset.cameraMoving = 'false';
      } else {
        motion.current = to;
        gl.domElement.dataset.cameraMoving = 'true';
      }
      invalidate();
    },
    [get, reduced, apply],
  );
  const fit = useCallback(
    (bounds: Bounds, reset = false, instant = false) => {
      const { camera } = get();
      if (!(camera instanceof PerspectiveCamera)) return;
      const direction = reset
        ? ([0, 0.1, 1] as Vec3)
        : (camera.position
            .clone()
            .sub(controls.current?.target ?? new Vector3())
            .toArray() as Vec3);
      const result = fitCamera(bounds, width / Math.max(1, height), camera.fov, direction);
      camera.near = result.near;
      camera.far = Math.max(result.far, camera.far);
      camera.updateProjectionMatrix();
      move(result.position, result.target, instant);
    },
    [get, width, height, move],
  );
  useLayoutEffect(() => {
    const size = `${Math.round(width)}x${Math.round(height)}`;
    if (!initialized.current || (fittedSize.current !== size && fitMode.current !== null)) {
      const selected = useOverview.getState().selectedNodeId;
      const item = fitMode.current === 'selection' && selected ? layout.items[selected] : undefined;
      fit(item ? itemBounds(item) : layout.bounds, !initialized.current, true);
      initialized.current = true;
    }
    fittedSize.current = size;
    get().gl.domElement.dataset.cameraReady = size;
    get().invalidate();
  }, [layout, width, height, fit, get]);
  useLayoutEffect(() => {
    if (!focus || focused.current === focus.sequence) return;
    const item = focus.nodeId ? layout.items[focus.nodeId] : undefined;
    if (item) {
      focused.current = focus.sequence;
      fitMode.current = 'selection';
      fit(itemBounds(item));
    }
  }, [focus, layout, fit]);
  useLayoutEffect(() => {
    if (!request || processed.current === request.sequence) return;
    processed.current = request.sequence;
    const { camera } = get(),
      target = controls.current?.target.clone() ?? new Vector3();
    const action = request.action;
    const selected = useOverview.getState().selectedNodeId;
    if (action === 'fit-selection') {
      fitMode.current = 'selection';
      const item = selected ? layout.items[selected] : undefined;
      if (item) fit(itemBounds(item));
      return;
    }
    if (action === 'fit-all' || action === 'reset') {
      fitMode.current = 'all';
      fit(layout.bounds, action === 'reset');
      return;
    }
    fitMode.current = null;
    if (action === 'pan-to' && request.point) {
      const point = new Vector3(...request.point),
        delta = point.clone().sub(target);
      move(camera.position.clone().add(delta).toArray() as Vec3, request.point, true);
      return;
    }
    const offset = camera.position.clone().sub(target),
      position = camera.position.clone();
    if (action.startsWith('zoom-'))
      position.copy(target).add(offset.multiplyScalar(action === 'zoom-in' ? 0.8 : 1.25));
    else if (action.startsWith('orbit-')) {
      const spherical = new Spherical().setFromVector3(offset);
      spherical.theta += action === 'orbit-left' ? 0.2 : action === 'orbit-right' ? -0.2 : 0;
      spherical.phi += action === 'orbit-up' ? -0.2 : action === 'orbit-down' ? 0.2 : 0;
      spherical.makeSafe();
      position.copy(target).add(new Vector3().setFromSpherical(spherical));
    } else {
      const horizontal = action === 'pan-left' || action === 'pan-right';
      const delta = new Vector3()
        .setFromMatrixColumn(camera.matrixWorld, horizontal ? 0 : 1)
        .multiplyScalar(
          offset.length() * 0.1 * (action === 'pan-left' || action === 'pan-down' ? -1 : 1),
        );
      position.add(delta);
      target.add(delta);
    }
    move(position.toArray() as Vec3, target.toArray() as Vec3);
  }, [request, layout, get, fit, move]);
  useFrame((state, delta) => {
    const control = controls.current;
    if (motion.current && control) {
      const to = motion.current,
        amount = 1 - Math.exp(-Math.min(delta, 0.1) * 12);
      const position = state.camera.position.clone().lerp(to.position, amount),
        target = control.target.clone().lerp(to.target, amount);
      const done = position.distanceTo(to.position) + target.distanceTo(to.target) < 0.001;
      apply(done ? to.position : position, done ? to.target : target);
      if (done) motion.current = null;
      else state.invalidate();
    }
    state.gl.domElement.dataset.cameraMoving = String(motion.current !== null);
    state.gl.domElement.dataset.cameraPosition = JSON.stringify(
      state.camera.position.toArray().map((v) => +v.toFixed(4)),
    );
    state.gl.domElement.dataset.cameraTarget = JSON.stringify(
      control?.target.toArray().map((v) => +v.toFixed(4)) ?? [],
    );
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!reduced}
      onStart={() => {
        get().setEvents({ enabled: false });
        useOverview.setState({ hoveredNodeId: null, hoveredDetail: null, hoveredEdgeId: null });
        fitMode.current = null;
        motion.current = null;
      }}
      onEnd={() => {
        get().setEvents({ enabled: true });
        get().events.update?.();
      }}
    />
  );
}
