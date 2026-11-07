import { useEffect, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Plane, Vector3, PerspectiveCamera } from 'three';
import type { CodeNode } from '../../core/model/types';
import type { Vec3 } from '../../core/model/layout/types';
import { useHostWindow } from '../../shared/HostWindow';
import { navigateTo } from '../editor/navigation';
import { useOverview } from './store';
import { moveFunction, saveFunctionOffsets } from './function-positions';

interface Drag {
  pointerId: number;
  x: number;
  y: number;
  plane: Plane;
  point: Vector3;
  original: Vec3;
  pending: Vec3;
  unitsPerPixel: number;
  moved: boolean;
  restoreControls: () => void;
}

export function useFunctionDrag(node: CodeNode, click: (event: ThreeEvent<MouseEvent>) => void) {
  const get = useThree((state) => state.get);
  const host = useHostWindow();
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const last = useRef(0);
  const suppressClick = useRef(false);
  const clearClickGuard = useRef<(() => void) | null>(null);
  const flush = () => {
    if (drag.current?.moved) moveFunction(node.id, drag.current.pending, false);
  };
  useEffect(() => {
    const cancel = () => {
      host.cancelAnimationFrame(frame.current);
      frame.current = 0;
      const current = drag.current;
      if (!current) return;
      current.restoreControls();
      drag.current = null;
      if (useOverview.getState().movingNodeId === node.id) {
        moveFunction(node.id, current.original);
        useOverview.setState({ movingNodeId: null });
      }
    };
    host.addEventListener('blur', cancel);
    host.addEventListener('pointercancel', cancel);
    return () => {
      host.removeEventListener('blur', cancel);
      host.removeEventListener('pointercancel', cancel);
      host.cancelAnimationFrame(frame.current);
      clearClickGuard.current?.();
      drag.current?.restoreControls();
      if (useOverview.getState().movingNodeId === node.id)
        useOverview.setState({ movingNodeId: null });
    };
  }, [get, host, node.id]);
  const finish = (event: ThreeEvent<PointerEvent>, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.stopPropagation();
    host.cancelAnimationFrame(frame.current);
    frame.current = 0;
    if (current.moved) {
      // Moving in depth can uncover another object beneath the pointer. Consume the
      // ensuing native click before R3F can select that unrelated source object.
      clearClickGuard.current?.();
      const canvas = get().gl.domElement;
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopImmediatePropagation();
        clear();
      };
      const clear = () => {
        canvas.removeEventListener('click', swallow, true);
        canvas.removeEventListener('pointerdown', clear, true);
        host.clearTimeout(timer);
      };
      const timer = host.setTimeout(clear, 500);
      canvas.addEventListener('click', swallow, { capture: true, once: true });
      canvas.addEventListener('pointerdown', clear, { capture: true, once: true });
      clearClickGuard.current = clear;
      if (cancelled) moveFunction(node.id, current.original, false);
      else flush();
      saveFunctionOffsets();
      useOverview.setState({ movingNodeId: null });
      if (!cancelled && node.fileId)
        navigateTo({ path: node.fileId, line: node.range.startLine, column: node.range.startCol });
    }
    current.restoreControls();
    drag.current = null;
    const target = event.target as Element | null;
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };
  return {
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      const { camera, size } = get();
      const candidate = get().controls;
      const controls =
        candidate && 'enabled' in candidate && typeof candidate.enabled === 'boolean'
          ? (candidate as typeof candidate & { enabled: boolean })
          : null;
      const enabled = controls?.enabled ?? true;
      if (controls) controls.enabled = false;
      const direction = camera.getWorldDirection(new Vector3());
      const offset = useOverview.getState().functionOffsets[node.id]?.slice() as Vec3 | undefined;
      suppressClick.current = false;
      drag.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        plane: new Plane().setFromNormalAndCoplanarPoint(direction, event.point),
        point: event.point.clone(),
        original: offset ?? [0, 0, 0],
        pending: offset ?? [0, 0, 0],
        moved: false,
        unitsPerPixel:
          camera instanceof PerspectiveCamera
            ? (2 *
                camera.position.distanceTo(event.point) *
                Math.tan((camera.fov * Math.PI) / 360)) /
              Math.max(1, size.height)
            : 0.02,
        restoreControls: () => {
          if (controls) {
            controls.enabled = enabled;
          }
        },
      };
      (event.target as Element | null)?.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ThreeEvent<PointerEvent>) => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      event.stopPropagation();
      if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 3)
        return;
      if (!current.moved) {
        current.moved = true;
        suppressClick.current = true;
        useOverview.setState({
          movingNodeId: node.id,
          selectedNodeId: node.id,
          hoveredNodeId: null,
          hoveredEdgeId: null,
        });
      }
      if (event.shiftKey)
        current.pending = [
          current.original[0],
          current.original[1],
          current.original[2] + (current.y - event.clientY) * current.unitsPerPixel,
        ];
      else {
        const point = event.ray.intersectPlane(current.plane, new Vector3());
        if (!point) return;
        current.pending = point
          .sub(current.point)
          .toArray()
          .map((axis, i) => axis + current.original[i]) as Vec3;
      }
      if (!frame.current) {
        const update = (now: number) => {
          if (now - last.current < 1000 / 30) {
            frame.current = host.requestAnimationFrame(update);
            return;
          }
          frame.current = 0;
          last.current = now;
          flush();
        };
        frame.current = host.requestAnimationFrame(update);
      }
    },
    onPointerUp: (event: ThreeEvent<PointerEvent>) => finish(event, false),
    onPointerCancel: (event: ThreeEvent<PointerEvent>) => finish(event, true),
    onClick: (event: ThreeEvent<MouseEvent>) => {
      if (suppressClick.current) {
        event.stopPropagation();
        suppressClick.current = false;
      } else click(event);
    },
  };
}
