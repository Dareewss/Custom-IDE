import { useMemo, type PointerEvent, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { minimapItems, minimapProjection, viewPolygon } from './minimap-math';
import { panCameraTo, requestCamera } from './camera-actions';
import { useOverview } from './store';
import type { SceneColors } from './scene-tokens';

interface Props {
  canvas: RefObject<HTMLCanvasElement | null>;
  model: CodeModel;
  layout: GraphLayout;
}
function useMapItems(model: CodeModel, layout: GraphLayout) {
  const external = useOverview((s) => s.showExternal),
    expanded = useOverview((s) => s.externalExpanded);
  return useMemo(
    () => minimapItems(model, layout, external, expanded),
    [model, layout, external, expanded],
  );
}
export function Minimap({ canvas, model, layout }: Props) {
  const items = useMapItems(model, layout);
  const projection = useMemo(() => minimapProjection(items), [items]);
  const pan = (event: PointerEvent<HTMLButtonElement>) => {
    const element = canvas.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(tokens.minimapWidth, ((event.clientX - box.x) / box.width) * tokens.minimapWidth),
    );
    const y = Math.max(
      0,
      Math.min(tokens.minimapHeight, ((event.clientY - box.y) / box.height) * tokens.minimapHeight),
    );
    panCameraTo(projection.unproject(x, y, Number(element.dataset.planeZ ?? 0)));
  };
  return (
    <button
      type="button"
      className="overview-minimap"
      aria-label="3D minimap"
      title="Click or drag to pan. Arrow keys pan; Home fits all."
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pan(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) pan(event);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        const direction = {
          ArrowLeft: 'pan-left',
          ArrowRight: 'pan-right',
          ArrowUp: 'pan-up',
          ArrowDown: 'pan-down',
        }[event.key];
        if (direction) {
          event.preventDefault();
          event.stopPropagation();
          requestCamera(direction as 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down');
        }
        if (event.key === 'Home') {
          event.preventDefault();
          event.stopPropagation();
          requestCamera('fit-all');
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          panCameraTo(
            projection.unproject(
              tokens.minimapWidth / 2,
              tokens.minimapHeight / 2,
              Number(canvas.current?.dataset.planeZ ?? 0),
            ),
          );
        }
      }}
    >
      <canvas
        ref={canvas}
        width={tokens.minimapWidth}
        height={tokens.minimapHeight}
        aria-hidden="true"
      />
      <span>Map</span>
    </button>
  );
}
export function MinimapDrawing({
  getCanvas,
  model,
  layout,
  colors,
}: Omit<Props, 'canvas'> & { colors: SceneColors; getCanvas: () => HTMLCanvasElement | null }) {
  const items = useMapItems(model, layout);
  const projection = useMemo(() => minimapProjection(items), [items]);
  const selected = useOverview((s) => s.selectedNodeId);
  useFrame((state) => {
    const element = getCanvas(),
      ctx = element?.getContext('2d');
    if (!element || !ctx) return;
    ctx.clearRect(0, 0, tokens.minimapWidth, tokens.minimapHeight);
    ctx.fillStyle = colors.fill;
    ctx.globalAlpha = tokens.minimapNodeOpacity;
    ctx.beginPath();
    for (const item of items) {
      const [x, y] = projection.project(item.position);
      const width = Math.max(tokens.minimapNodeMin, item.size[0] * projection.scale),
        height = Math.max(tokens.minimapNodeMin, item.size[1] * projection.scale);
      ctx.rect(x - width / 2, y - height / 2, width, height);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    const target = (state.controls as { target?: Vector3 } | null)?.target ?? new Vector3();
    const polygon = viewPolygon(state.camera, target.z).map((point) => projection.project(point));
    if (polygon.length) {
      ctx.beginPath();
      polygon.forEach(([x, y], i) => {
        const px = Math.max(-tokens.minimapWidth, Math.min(tokens.minimapWidth * 2, x)),
          py = Math.max(-tokens.minimapHeight, Math.min(tokens.minimapHeight * 2, y));
        if (!i) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.strokeStyle = colors.labelText;
      ctx.stroke();
      ctx.fillStyle = colors.active;
      ctx.globalAlpha = tokens.minimapFrustumOpacity;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const [x, y] = projection.project(target.toArray());
    ctx.strokeStyle = colors.labelText;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
    const item = selected ? layout.items[selected] : undefined;
    if (item) {
      const [sx, sy] = projection.project(item.position);
      ctx.strokeStyle = colors.active;
      ctx.strokeRect(sx - 3, sy - 3, 6, 6);
    }
    element.dataset.nodeCount = String(items.length);
    element.dataset.frustum = JSON.stringify(
      polygon.map((point) => point.map((n) => +n.toFixed(2))),
    );
    element.dataset.planeZ = String(target.z);
  });
  return null;
}
