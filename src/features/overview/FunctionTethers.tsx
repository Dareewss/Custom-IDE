import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, LineSegments } from 'three';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { headerPosition } from '../../core/model/layout/metrics';
import { isCallable } from '../../core/model/layout/offsets';
import type { SceneColors } from './scene-tokens';

export function FunctionTethers({
  model,
  layout,
  colors,
}: {
  model: CodeModel;
  layout: GraphLayout;
  colors: SceneColors;
}) {
  const ref = useRef<LineSegments>(null);
  const get = useThree((state) => state.get);
  const data = useMemo(() => {
    const functions = model.nodes.filter((node) => isCallable(node.kind) && layout.items[node.id]);
    const positions: number[] = [];
    for (const node of functions) {
      const parent = node.parentId && layout.items[node.parentId];
      if (parent)
        positions.push(...headerPosition(parent), ...headerPosition(layout.items[node.id]));
    }
    return { functions, positions };
  }, [model, layout]);
  const geometry = useMemo(
    () =>
      new BufferGeometry().setAttribute(
        'position',
        new BufferAttribute(new Float32Array(data.positions), 3),
      ),
    [data],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    ref.current?.computeLineDistances();
    const canvas = get().gl.domElement;
    const material = ref.current?.material;
    canvas.dataset.functionGuidesDashed = String(
      !Array.isArray(material) &&
        material?.type === 'LineDashedMaterial' &&
        !!geometry.getAttribute('lineDistance'),
    );
    canvas.dataset.functionTethers = String(data.positions.length / 6);
    canvas.dataset.functionLayers = JSON.stringify(
      data.functions.slice(0, 64).map((node) => ({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        position: layout.items[node.id].position,
        header: headerPosition(layout.items[node.id]),
      })),
    );
    get().invalidate();
    return () => {
      delete canvas.dataset.functionTethers;
      delete canvas.dataset.functionGuidesDashed;
      delete canvas.dataset.functionLayers;
    };
  }, [data, get, layout, geometry]);
  return (
    <lineSegments ref={ref} geometry={geometry} name="function-source-tethers" raycast={() => {}}>
      <lineDashedMaterial
        color={colors.functionFill}
        transparent
        opacity={colors.rimOpacity}
        dashSize={0.14}
        gapSize={0.12}
        depthWrite={false}
      />
    </lineSegments>
  );
}
