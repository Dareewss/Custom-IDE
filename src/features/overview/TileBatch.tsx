import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  OrthographicCamera,
  Plane,
  PlaneGeometry,
  Vector3,
  type Intersection,
  type Raycaster,
} from 'three';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import { pickTile } from '../../core/model/layout/tile-bvh';
import type { SceneColors } from './scene-tokens';
import { selectOverviewNode, setOverviewHover } from './selection';
import { useOverview } from './store';

export function TileBatch({
  layout,
  fileId,
  xScale,
  yScale,
  colors,
}: {
  layout: StructureLayout;
  fileId: string;
  xScale: number;
  yScale: number;
  colors: SceneColors;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const get = useThree((s) => s.get);
  const selected = useOverview((s) => s.selectedNodeId);
  const hovered = useOverview((s) => s.hoveredNodeId);
  const visible = useMemo(
    () => layout.tiles.flatMap((tile, index) => (tile.fileId === fileId ? [{ tile, index }] : [])),
    [layout, fileId],
  );
  const toInstance = useMemo(
    () => new Map(visible.map((entry, index) => [entry.index, index])),
    [visible],
  );
  const geometry = useMemo(() => {
    const geometry = new PlaneGeometry(1, 1);
    geometry.setAttribute(
      'tileSize',
      new InstancedBufferAttribute(
        new Float32Array(
          visible.flatMap(({ tile }) => [tile.width * xScale, tile.height * yScale]),
        ),
        2,
      ),
    );
    return geometry;
  }, [visible, xScale, yScale]);
  const pixel = useMemo(() => ({ value: 0.03 }), []);
  const material = useMemo(() => {
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0.86, depthWrite: false });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.tilePixel = pixel;
      shader.vertexShader =
        'attribute vec2 tileSize; varying vec2 tileExtent; varying vec2 tileUv;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntileExtent = tileSize; tileUv = uv;',
        );
      shader.fragmentShader =
        'uniform float tilePixel; varying vec2 tileExtent; varying vec2 tileUv;\n' +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        vec2 halfSize = tileExtent * .5 - min(vec2(tilePixel * .75), tileExtent * .2);
        float radius = min(tilePixel * 1.5, min(halfSize.x, halfSize.y));
        vec2 q = abs((tileUv - .5) * tileExtent) - halfSize + radius;
        if (length(max(q, 0.)) + min(max(q.x, q.y), 0.) > radius) discard;`,
        );
    };
    return material;
  }, [pixel]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4();
    const palette = [
      colors.other,
      colors.classFill,
      colors.functionFill,
      colors.active,
      colors.fill,
    ];
    visible.forEach(({ tile }, index) => {
      matrix.makeScale(tile.width * xScale, tile.height * yScale, 1);
      matrix.setPosition(
        (tile.x + tile.width / 2) * xScale,
        (tile.y + tile.height / 2) * yScale,
        0,
      );
      mesh.current!.setMatrixAt(index, matrix);
      const active = tile.nodeIds.includes(selected ?? '') || tile.nodeIds.includes(hovered ?? '');
      mesh.current!.setColorAt(index, new Color(active ? colors.active : palette[tile.level]));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    get().invalidate();
  }, [visible, colors, selected, hovered, xScale, yScale, get]);
  useFrame(({ camera }) => {
    if (camera instanceof OrthographicCamera) pixel.value = 1 / camera.zoom;
  });
  const raycast = useMemo(() => {
    const plane = new Plane(new Vector3(0, 0, 1), 0),
      point = new Vector3();
    return function (this: InstancedMesh, raycaster: Raycaster, hits: Intersection[]) {
      if (!raycaster.ray.intersectPlane(plane, point)) return;
      const index = pickTile(
        layout.picking[fileId],
        layout.tiles,
        point.x / xScale,
        point.y / yScale,
        pixel.value / xScale,
        pixel.value / yScale,
      );
      const instanceId = index === null ? undefined : toInstance.get(index);
      const distance = point.distanceTo(raycaster.ray.origin);
      if (instanceId !== undefined && distance >= raycaster.near && distance <= raycaster.far)
        hits.push({ object: this, point: point.clone(), distance, instanceId });
    };
  }, [layout, fileId, xScale, yScale, pixel, toInstance]);
  const tileFor = (event: ThreeEvent<MouseEvent | PointerEvent>): StructureTile | undefined =>
    typeof event.instanceId === 'number' ? visible[event.instanceId]?.tile : undefined;
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, visible.length]}
      raycast={raycast}
      onClick={(event) => {
        const tile = tileFor(event),
          node = useOverview.getState().indexes?.nodeById.get(tile?.nodeIds[0] ?? '');
        if (node) {
          event.stopPropagation();
          selectOverviewNode(node);
        }
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        setOverviewHover(tileFor(event)?.nodeIds[0] ?? null);
      }}
      onPointerOut={() => setOverviewHover(null)}
      onAfterRender={() => {
        const { gl, camera, size } = get(),
          data = gl.domElement.dataset;
        data.tileInstances = String(visible.length);
        data.tileMeshes = '1';
        data.tilePicking = 'bvh';
        data.tileEdges = '0';
        data.cameraMoving = 'false';
        data.sceneKind = 'flat';
        data.cameraZoom = String(camera.zoom);
        data.renderSize = JSON.stringify([size.width, size.height]);
        data.planeRows = JSON.stringify(layout.planes);
        data.sceneFrames = String(Number(data.sceneFrames ?? 0) + 1);
        data.tileHits = JSON.stringify(
          visible.slice(0, 32).map(({ tile }) => {
            const position = new Vector3(
              (tile.x + tile.width / 2) * xScale,
              (tile.y + tile.height / 2) * yScale,
              0,
            ).project(camera);
            return {
              id: tile.id,
              nodeIds: tile.nodeIds,
              level: tile.level,
              x: ((position.x + 1) * size.width) / 2,
              y: ((1 - position.y) * size.height) / 2,
            };
          }),
        );
      }}
    />
  );
}
