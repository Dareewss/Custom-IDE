import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { SpringValue } from '@react-spring/three';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Plane,
  PlaneGeometry,
  Vector3,
  OrthographicCamera,
  type Intersection,
  type Raycaster,
} from 'three';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import { pickTile } from '../../core/model/layout/tile-bvh';
import type { SceneColors } from './scene-tokens';
import { tileColor } from './tile-labels';
import { tilePose, planePoint, screenPoint, type PlaneTransform } from './plane-transform';
import { useTileContext } from './tile-context';
import { usePlaneView } from './plane-view';
import { requestCamera } from './camera-actions';
import { selectOverviewNode, setOverviewHover } from './selection';
import { useOverview } from './store';

export function TileBatch({
  layout,
  fileId,
  transform,
  progress,
  colors,
}: {
  layout: StructureLayout;
  fileId: string;
  transform: PlaneTransform;
  progress: SpringValue<number>;
  colors: SceneColors;
}) {
  const mesh = useRef<InstancedMesh>(null),
    last = useRef(-1);
  const get = useThree((s) => s.get);
  const selected = useOverview((s) => s.selectedNodeId),
    hovered = useOverview((s) => s.hoveredNodeId);
  const { visible, related } = useTileContext(layout, fileId);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(clickTimer.current), []);
  const toInstance = useMemo(
    () => new Map(visible.map((entry, index) => [entry.index, index])),
    [visible],
  );
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    geometry.setAttribute(
      'tileSize',
      new InstancedBufferAttribute(new Float32Array(visible.length * 2), 2),
    );
    geometry.setAttribute(
      'tileOpacity',
      new InstancedBufferAttribute(new Float32Array(visible.length), 1),
    );
    return geometry;
  }, [visible]);
  const material = useMemo(() => {
    const material = new MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: true });
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        'attribute vec2 tileSize; attribute float tileOpacity; varying vec2 tileExtent; varying vec2 tileUv; varying float tileAlpha;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntileExtent=tileSize; tileUv=uv; tileAlpha=tileOpacity;',
        );
      shader.fragmentShader =
        'varying vec2 tileExtent; varying vec2 tileUv; varying float tileAlpha;\n' +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        vec2 pixel = vec2(length(vec2(dFdx(tileUv.x),dFdy(tileUv.x))),length(vec2(dFdx(tileUv.y),dFdy(tileUv.y)))) * tileExtent;
        vec2 halfSize = tileExtent*.5-min(pixel*.75,tileExtent*.2);
        float radius=min(min(pixel.x,pixel.y)*1.5,min(halfSize.x,halfSize.y));
        vec2 q=abs((tileUv-.5)*tileExtent)-halfSize+radius;
        if(length(max(q,0.))+min(max(q.x,q.y),0.)>radius || tileAlpha < .001) discard;
        diffuseColor.a *= tileAlpha;`,
        );
    };
    return material;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    visible.forEach(({ tile }, index) => {
      const active = tile.nodeIds.includes(selected ?? '') || tile.nodeIds.includes(hovered ?? '');
      mesh.current!.setColorAt(
        index,
        new Color(
          tileColor(
            tile.level,
            colors,
            active,
            !!related && !tile.nodeIds.some((id) => related.has(id)),
          ),
        ),
      );
    });
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    last.current = -1;
    get().invalidate();
  }, [visible, colors, selected, hovered, related, transform, get]);
  useFrame(() => {
    if (!mesh.current) return;
    const t = progress.get();
    if (last.current === t) return;
    last.current = t;
    const matrix = new Matrix4(),
      size = geometry.getAttribute('tileSize'),
      alpha = geometry.getAttribute('tileOpacity');
    visible.forEach(({ tile }, index) => {
      const pose = tilePose(tile, layout, transform, t);
      matrix
        .makeRotationX(pose.angle)
        .scale(new Vector3(pose.width, pose.height, 1))
        .setPosition(...pose.position);
      mesh.current!.setMatrixAt(index, matrix);
      size.setXY(index, pose.width, pose.height);
      alpha.setX(index, tile.fileId === fileId ? 1 : t);
    });
    size.needsUpdate = true;
    alpha.needsUpdate = true;
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  });
  const raycast = useMemo(() => {
    const plane = new Plane(),
      point = new Vector3(),
      anchor = new Vector3(),
      normal = new Vector3(),
      up = new Vector3();
    return function (this: InstancedMesh, raycaster: Raycaster, hits: Intersection[]) {
      if (!progress.idle) return;
      const t = progress.get(),
        angle = Math.atan2(-transform.layerYScale * t, transform.yScale * (1 - t));
      normal.set(0, -Math.sin(angle), Math.cos(angle));
      up.set(0, Math.cos(angle), Math.sin(angle));
      const unit = Math.hypot(transform.yScale * (1 - t), transform.layerYScale * t),
        xUnit = (1 - t) * transform.xScale + t * transform.layerXScale;
      for (const lane of layout.lanes) {
        if (t === 0 && lane.fileId !== fileId) continue;
        for (const level of layout.planes) {
          anchor.set(
            ...planePoint(0, -level.firstRow, level.level, lane.index, layout, transform, t),
          );
          plane.setFromNormalAndCoplanarPoint(normal, anchor);
          if (!raycaster.ray.intersectPlane(plane, point)) continue;
          const { camera, size } = get();
          const depth = Math.abs(point.clone().applyMatrix4(camera.matrixWorldInverse).z);
          const pixel =
            camera instanceof OrthographicCamera
              ? 1 / camera.zoom
              : (2 * depth) / (Math.abs(camera.projectionMatrix.elements[5]) * size.height);
          const index = pickTile(
            layout.picking[lane.fileId],
            layout.tiles,
            (point.x - transform.xOffset) / xUnit,
            -level.firstRow + point.clone().sub(anchor).dot(up) / unit,
            pixel / xUnit,
            pixel / unit,
          );
          if (index === null || layout.tiles[index].level !== level.level) continue;
          const instanceId = toInstance.get(index),
            distance = point.distanceTo(raycaster.ray.origin);
          if (instanceId !== undefined && distance >= raycaster.near && distance <= raycaster.far)
            hits.push({ object: this, point: point.clone(), distance, instanceId });
        }
      }
    };
  }, [layout, fileId, transform, progress, toInstance, get]);
  const tileFor = (event: ThreeEvent<MouseEvent | PointerEvent>): StructureTile | undefined =>
    typeof event.instanceId === 'number' ? visible[event.instanceId]?.tile : undefined;
  return (
    <instancedMesh
      ref={mesh}
      name="source-tiles"
      args={[geometry, material, visible.length]}
      raycast={raycast}
      onClick={(event) => {
        if (event.delta > 3) return;
        const tile = tileFor(event),
          node = useOverview.getState().indexes?.nodeById.get(tile?.nodeIds[0] ?? '');
        if (node) {
          event.stopPropagation();
          clearTimeout(clickTimer.current);
          clickTimer.current = setTimeout(() => selectOverviewNode(node), 280);
        }
      }}
      onDoubleClick={(event) => {
        const tile = tileFor(event);
        if (!tile) return;
        event.stopPropagation();
        clearTimeout(clickTimer.current);
        if (tile.nodeIds.length === 1) {
          useOverview.setState({ selectedNodeId: tile.nodeIds[0] });
          usePlaneView.setState({ rootId: tile.nodeIds[0] });
        } else {
          useOverview.setState({ selectedNodeId: tile.nodeIds[0] });
          requestCamera('fit-selection');
        }
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        const tile = tileFor(event);
        const detail =
          tile && tile.nodeIds.length > 1
            ? `${tile.nodeIds.length} objects: ${tile.nodeIds
                .slice(0, 8)
                .map((id) => useOverview.getState().indexes?.nodeById.get(id)?.name ?? id)
                .join(', ')}${tile.nodeIds.length > 8 ? ', ...' : ''}`
            : null;
        setOverviewHover(tile?.nodeIds[0] ?? null, detail);
      }}
      onPointerOut={() => setOverviewHover(null)}
      onAfterRender={() => {
        const { gl, camera, size } = get(),
          data = gl.domElement.dataset,
          t = progress.get();
        data.tileInstances = String(visible.length);
        data.tileMeshes = '1';
        data.tilePicking = 'bvh';
        data.dimmedTiles = String(
          related
            ? visible.filter(({ tile }) => !tile.nodeIds.some((id) => related.has(id))).length
            : 0,
        );
        data.structureScale = String(layout.pixelsPerUnit);
        data.requestedScale = String(usePlaneView.getState().pixelsPerUnit);
        data.sceneKind = t === 0 ? 'flat' : 'layers';
        data.cameraZoom = String(camera.zoom);
        data.renderSize = JSON.stringify([size.width, size.height]);
        data.planeRows = JSON.stringify(layout.planes);
        data.sceneFrames = String(Number(data.sceneFrames ?? 0) + 1);
        data.tileHits = JSON.stringify(
          visible.slice(0, 32).map(({ tile }) => {
            const pose = tilePose(tile, layout, transform, t),
              [x, y] = screenPoint(pose.position, camera, size.width, size.height);
            return {
              id: tile.id,
              nodeIds: tile.nodeIds,
              level: tile.level,
              lane: tile.lane,
              x,
              y,
              position: pose.position,
            };
          }),
        );
      }}
    />
  );
}
