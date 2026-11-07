import type { searchModel } from '../../core/model/search';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { BufferGeometry, BufferAttribute, Color, InstancedMesh, Object3D, Vector3 } from 'three';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { useOverview } from './store';
import { selectOverviewNode } from './selection';
import { navigateTo } from '../editor/navigation';
import { edgeBatch } from './edge-batch';
import type { SceneColors } from './scene-tokens';

export function GraphEdges({
  model,
  layout,
  colors,
  search,
}: {
  model: CodeModel;
  layout: GraphLayout;
  colors: SceneColors;
  search: ReturnType<typeof searchModel>;
}) {
  const kinds = useOverview((s) => s.edgeKinds),
    showExternal = useOverview((s) => s.showExternal);
  const expanded = useOverview((s) => s.externalExpanded);
  const hovered = useOverview((s) => s.hoveredEdgeId),
    selected = useOverview((s) => s.selectedNodeId);
  const get = useThree((s) => s.get);
  const arrows = useRef<InstancedMesh>(null);
  useEffect(
    () => () => {
      get().gl.domElement.dataset.edgeCount = '0';
      get().gl.domElement.dataset.dashedEdgeCount = '0';
      useOverview.setState({ hoveredEdgeId: null });
      get().invalidate();
    },
    [get],
  );
  const byId = useMemo(() => new Map(model.nodes.map((node) => [node.id, node])), [model]);
  const data = useMemo(
    () =>
      edgeBatch(
        layout.edges.filter(
          ({ edge }) =>
            kinds[edge.kind] &&
            (showExternal ||
              (byId.get(edge.from)?.kind !== 'external' && byId.get(edge.to)?.kind !== 'external')),
        ),
        expanded,
      ),
    [layout, kinds, showExternal, expanded, byId],
  );
  const colorFor = useCallback(
    (edge: LayoutEdgeLike) =>
      edge.id === hovered || edge.from === selected || edge.to === selected
        ? colors.active
        : edge.kind === 'import'
          ? colors.other
          : edge.kind === 'inherits'
            ? colors.classFill
            : colors.functionFill,
    [hovered, selected, colors],
  );
  const geometry = useMemo(
    () => new BufferGeometry().setAttribute('position', new BufferAttribute(data.positions, 3)),
    [data],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const color = new Color(),
      values = new Float32Array(data.owners.length * 6);
    data.owners.forEach((owner, i) => {
      color
        .set(colorFor(owner.edge))
        .multiplyScalar(
          search.active &&
            !search.context.has(owner.edge.from) &&
            !search.context.has(owner.edge.to)
            ? colors.searchDim
            : 1,
        );
      color.toArray(values, i * 6);
      color.toArray(values, i * 6 + 3);
    });
    geometry.setAttribute('color', new BufferAttribute(values, 3));
    const object = new Object3D(),
      up = new Vector3(0, 1, 0),
      direction = new Vector3();
    data.arrows.forEach(({ edge, end, previous }, i) => {
      direction
        .set(...end)
        .sub(new Vector3(...previous))
        .normalize();
      object.position.set(...end).addScaledVector(direction, -tokens.edgeArrowLength / 2);
      object.quaternion.setFromUnitVectors(up, direction);
      object.updateMatrix();
      arrows.current?.setMatrixAt(i, object.matrix);
      arrows.current?.setColorAt(
        i,
        color
          .set(colorFor(edge.edge))
          .multiplyScalar(
            search.active &&
              !search.context.has(edge.edge.from) &&
              !search.context.has(edge.edge.to)
              ? colors.searchDim
              : 1,
          ),
      );
    });
    if (arrows.current) {
      arrows.current.instanceMatrix.needsUpdate = true;
      if (arrows.current.instanceColor) arrows.current.instanceColor.needsUpdate = true;
      arrows.current.computeBoundingSphere();
    }
    const { gl, invalidate } = get();
    gl.domElement.dataset.edgeCount = String(data.arrows.length);
    gl.domElement.dataset.dashedEdgeCount = String(
      data.arrows.filter(({ edge }) => !edge.edge.resolved).length,
    );
    invalidate();
  }, [data, geometry, colorFor, get, search, colors.searchDim]);
  const hit = (event: ThreeEvent<PointerEvent>) => {
    const edge =
      event.index === undefined ? undefined : data.owners[Math.floor(event.index / 2)]?.edge;
    if (edge) {
      event.stopPropagation();
      if (useOverview.getState().hoveredEdgeId !== edge.id)
        useOverview.setState({ hoveredEdgeId: edge.id });
    }
  };
  return (
    <>
      <lineSegments
        geometry={geometry}
        onPointerOver={hit}
        onPointerMove={hit}
        onPointerOut={() => useOverview.setState({ hoveredEdgeId: null })}
        onClick={(event) => {
          const edge =
            event.index === undefined ? undefined : data.owners[Math.floor(event.index / 2)]?.edge;
          const node = edge ? byId.get(edge.from) : undefined;
          if (!edge || !node) return;
          event.stopPropagation();
          selectOverviewNode(node);
          if (edge.source)
            navigateTo({
              path: edge.source.fileId,
              line: edge.source.range.startLine,
              column: edge.source.range.startCol,
            });
        }}
      >
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={colors.rimOpacity}
          depthWrite={false}
        />
      </lineSegments>
      {data.arrows.length > 0 && (
        <instancedMesh
          ref={arrows}
          args={[undefined, undefined, data.arrows.length]}
          raycast={() => {}}
        >
          <coneGeometry
            args={[tokens.edgeArrowRadius, tokens.edgeArrowLength, tokens.edgeArrowSegments]}
          />
          <meshBasicMaterial vertexColors transparent opacity={colors.activeOpacity} />
        </instancedMesh>
      )}
    </>
  );
}
type LayoutEdgeLike = GraphLayout['edges'][number]['edge'];
