import type { StructureLayout } from '../../core/model/layout/structure-types';
import { useOverview } from './store';
import { usePlaneView } from './plane-view';
import { useLayoutEffect, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MOUSE, OrthographicCamera, Vector3 } from 'three';

export function PlaneCamera({
  layout,
  rows,
  fileId,
  zoom,
  xScale,
  yScale,
  xOffset,
}: {
  layout: StructureLayout;
  rows: number;
  xScale: number;
  yScale: number;
  xOffset: number;
  fileId: string;
  zoom: number;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const get = useThree((s) => s.get),
    width = useThree((s) => s.size.width),
    height = useThree((s) => s.size.height);
  const rootId = usePlaneView((s) => s.rootId);
  const focus = useOverview((s) => s.focusRequest),
    request = useOverview((s) => s.cameraRequest);
  const focused = useRef(useOverview.getState().handledFocusSequence),
    processed = useRef(0);
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
  }, [get, width, height, rows, fileId, zoom, rootId]);
  useLayoutEffect(() => {
    const { camera, gl, invalidate } = get();
    if (!(camera instanceof OrthographicCamera)) return;
    const isFocus = !!focus && focused.current !== focus.sequence;
    const isRequest = !!request && processed.current !== request.sequence;
    const id = isFocus ? focus.nodeId : useOverview.getState().selectedNodeId;
    const rect = id ? layout.rects[id] : undefined;
    if (!rect || rect.fileId !== fileId) return;
    const center = new Vector3(
      (rect.x + rect.width / 2) * xScale + xOffset,
      (rect.y + rect.height / 2) * yScale,
      0,
    );
    const projected = center.clone().project(camera);
    if (isRequest && request.action === 'fit-selection') {
      camera.zoom = Math.max(
        0.5,
        Math.min(
          500,
          (width - 100) / (rect.width * xScale),
          (height - 60) / (rect.height * yScale),
        ),
      );
      processed.current = request.sequence;
      camera.position.set(center.x, center.y, 100);
      controls.current?.target.copy(center);
    } else if (isFocus) {
      if (Math.abs(projected.x) > 0.85 || Math.abs(projected.y) > 0.85) {
        camera.position.set(center.x, center.y, 100);
        controls.current?.target.copy(center);
      }
      focused.current = focus.sequence;
      useOverview.setState({ handledFocusSequence: focus.sequence });
      gl.domElement.dataset.focusedTile = id ?? '';
    } else return;
    camera.updateProjectionMatrix();
    controls.current?.update();
    invalidate();
  }, [focus, request, layout, fileId, width, height, xScale, yScale, xOffset, get]);
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
