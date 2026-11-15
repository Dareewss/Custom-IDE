import { useLayoutEffect, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { SpringValue } from '@react-spring/three';
import { MOUSE, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { useOverview } from './store';
import { usePlaneView } from './plane-view';
import { useTileContext } from './tile-context';
import { fitCamera } from './camera-math';
import { tilePose, type PlaneTransform } from './plane-transform';
import type { Vec3 } from '../../core/model/layout/types';

export function PlaneCamera({
  layout,
  fileId,
  zoom,
  transform,
  progress,
}: {
  layout: StructureLayout;
  fileId: string;
  zoom: number;
  transform: PlaneTransform;
  progress: SpringValue<number>;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const get = useThree((s) => s.get),
    liveCamera = useThree((s) => s.camera),
    width = useThree((s) => s.size.width),
    height = useThree((s) => s.size.height);
  const cameras = useRef<{ flat: OrthographicCamera; perspective: PerspectiveCamera } | null>(null);
  const mode = usePlaneView((s) => s.mode),
    rootId = usePlaneView((s) => s.rootId);
  const { visible } = useTileContext(layout, fileId);
  const focus = useOverview((s) => s.focusRequest),
    request = useOverview((s) => s.cameraRequest);
  const focused = useRef(useOverview.getState().handledFocusSequence),
    processed = useRef(0),
    last = useRef(-1),
    previousMode = useRef(mode);
  const flatPose = useRef({
    position: new Vector3(14, (-layout.height * transform.yScale) / 2, 100),
    target: new Vector3(14, (-layout.height * transform.yScale) / 2, 0),
    zoom,
  });
  const layerPose = useRef({ position: new Vector3(30, 40, 30), target: new Vector3() });
  useLayoutEffect(() => {
    if (!cameras.current) {
      const flat = get().camera;
      if (!(flat instanceof OrthographicCamera))
        throw new Error('Flat needs an orthographic camera');
      cameras.current = { flat, perspective: new PerspectiveCamera(45, 1, 0.01, 10000) };
    }
    const { flat, perspective } = cameras.current;
    const current = get().camera,
      changed = previousMode.current !== mode;
    if (changed && previousMode.current === 'flat')
      flatPose.current = {
        position: current.position.clone(),
        target: controls.current?.target.clone() ?? flatPose.current.target,
        zoom: current.zoom,
      };
    else if (!changed)
      flatPose.current = {
        position: new Vector3(14, (-layout.height * transform.yScale) / 2, 100),
        target: new Vector3(14, (-layout.height * transform.yScale) / 2, 0),
        zoom,
      };
    if (changed && previousMode.current === 'layers')
      layerPose.current = {
        position: current.position.clone(),
        target: controls.current?.target.clone() ?? layerPose.current.target,
      };
    else {
      const min: Vec3 = [Infinity, Infinity, Infinity],
        max: Vec3 = [-Infinity, -Infinity, -Infinity];
      for (const { tile } of visible) {
        const p = tilePose(tile, layout, transform, 1);
        const extent = [p.width / 2, 0.25, p.height / 2];
        for (let axis = 0; axis < 3; axis++) {
          min[axis] = Math.min(min[axis], p.position[axis] - extent[axis]);
          max[axis] = Math.max(max[axis], p.position[axis] + extent[axis]);
        }
      }
      if (visible.length) {
        const fitted = fitCamera({ min, max }, width / Math.max(1, height), 45, [0.25, 1, 0.55]);
        layerPose.current = {
          position: new Vector3(...fitted.position),
          target: new Vector3(...fitted.target),
        };
        perspective.far = fitted.far;
      }
    }
    flat.left = -width / 2;
    flat.right = width / 2;
    flat.top = height / 2;
    flat.bottom = -height / 2;
    perspective.aspect = width / Math.max(1, height);
    previousMode.current = mode;
    last.current = -1;
    get().invalidate();
    // Fit on an explicit mode/scope/spacing/viewport change; zoom aggregation never resets the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    rootId,
    fileId,
    width,
    height,
    zoom,
    transform.gap,
    transform.yScale,
    layout.height,
    layout.lanes.length,
  ]);
  useLayoutEffect(() => {
    last.current = -1;
    get().invalidate();
  }, [liveCamera, get]);
  useFrame(({ gl, invalidate, set }) => {
    if (!cameras.current) return;
    const { flat, perspective } = cameras.current;
    const t = progress.get(),
      camera = t === 0 ? flat : perspective;
    if (get().camera !== camera) set({ camera });
    if (last.current !== t) {
      last.current = t;
      camera.position.copy(flatPose.current.position).lerp(layerPose.current.position, t);
      const target = flatPose.current.target.clone().lerp(layerPose.current.target, t);
      if (camera instanceof PerspectiveCamera) {
        const distance = flatPose.current.position.distanceTo(flatPose.current.target);
        const matched =
          (2 * Math.atan(height / (flatPose.current.zoom * 2 * distance)) * 180) / Math.PI;
        camera.fov = matched + (45 - matched) * t;
      } else camera.zoom = flatPose.current.zoom;
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      controls.current?.target.copy(target);
      controls.current?.update();
    }
    if (controls.current) controls.current.enabled = progress.idle;
    gl.domElement.dataset.cameraMoving = String(!progress.idle);
    gl.domElement.dataset.cameraProjection =
      camera instanceof OrthographicCamera ? 'orthographic' : 'perspective';
    gl.domElement.dataset.layerProgress = String(t);
    gl.domElement.dataset.cameraTarget = JSON.stringify(controls.current?.target.toArray() ?? []);
    gl.domElement.dataset.cameraPosition = JSON.stringify(camera.position.toArray());
    gl.domElement.dataset.cameraReady = `${Math.round(width)}x${Math.round(height)}`;
    if (!progress.idle) invalidate();
  }, -1);
  useLayoutEffect(() => {
    const { camera, gl, invalidate } = get();
    const isFocus = !!focus && focused.current !== focus.sequence,
      isRequest = !!request && processed.current !== request.sequence;
    const id = isFocus ? focus.nodeId : useOverview.getState().selectedNodeId,
      rect = id ? layout.rects[id] : undefined;
    if (!rect || !visible.some((entry) => entry.tile.nodeIds.includes(id ?? ''))) return;
    const p = tilePose(rect, layout, transform, progress.get()),
      center = new Vector3(...p.position),
      projected = center.clone().project(camera);
    if (isRequest && request.action === 'fit-selection') {
      processed.current = request.sequence;
      if (camera instanceof OrthographicCamera) {
        camera.zoom = Math.max(
          0.5,
          Math.min(500, (width - 100) / p.width, (height - 60) / p.height),
        );
        camera.position.set(center.x, center.y, 100);
      } else {
        const fit = fitCamera(
          {
            min: [center.x - p.width / 2, center.y - 0.5, center.z - p.height / 2],
            max: [center.x + p.width / 2, center.y + 0.5, center.z + p.height / 2],
          },
          width / height,
          45,
        );
        camera.position.set(...fit.position);
      }
      controls.current?.target.copy(center);
    } else if (isFocus) {
      if (Math.abs(projected.x) > 0.85 || Math.abs(projected.y) > 0.85) {
        const target = controls.current?.target ?? new Vector3();
        camera.position.add(center.clone().sub(target));
        controls.current?.target.copy(center);
      }
      focused.current = focus.sequence;
      useOverview.setState({ handledFocusSequence: focus.sequence });
      gl.domElement.dataset.focusedTile = id ?? '';
    } else return;
    const target = controls.current?.target.clone() ?? center;
    if (camera instanceof OrthographicCamera)
      flatPose.current = { position: camera.position.clone(), target, zoom: camera.zoom };
    else layerPose.current = { position: camera.position.clone(), target };
    last.current = progress.get();
    camera.lookAt(controls.current?.target ?? center);
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [focus, request, layout, visible, transform, progress, get, width, height]);
  return (
    <OrbitControls
      ref={controls}
      camera={liveCamera}
      makeDefault
      enableRotate={mode === 'layers'}
      enableDamping={false}
      minZoom={0.5}
      maxZoom={500}
      minPolarAngle={mode === 'layers' ? Math.PI / 8 : 0}
      maxPolarAngle={mode === 'layers' ? Math.PI / 2.2 : Math.PI}
      minDistance={1}
      maxDistance={10000}
      mouseButtons={{
        LEFT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
        RIGHT: mode === 'layers' ? MOUSE.ROTATE : MOUSE.PAN,
      }}
    />
  );
}
