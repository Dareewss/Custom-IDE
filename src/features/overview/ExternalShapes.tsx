import { Edges } from '@react-three/drei';
import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { useOverview } from './store';
import { SceneLabel } from './SceneLabel';
import { selectOverviewNode, setOverviewHover } from './selection';
import type { SceneColors } from './scene-tokens';

export function ExternalShapes({
  model,
  layout,
  colors,
}: {
  model: CodeModel;
  layout: GraphLayout;
  colors: SceneColors;
}) {
  const show = useOverview((s) => s.showExternal);
  const expanded = useOverview((s) => s.externalExpanded);
  const nodes = model.nodes.filter((node) => node.kind === 'external');
  if (!show || !nodes.length || !layout.externalCluster) return null;
  const entries = expanded
    ? nodes.map((node) => ({ id: node.id, node, item: layout.items[node.id], name: node.name }))
    : [
        {
          id: layout.externalCluster.id,
          node: null,
          item: layout.externalCluster,
          name: `External · ${nodes.length}`,
        },
      ];
  return (
    <>
      {entries.map(({ id, node, item, name }, index) => (
        <group
          key={id}
          position={item.position}
          onClick={(e) => {
            e.stopPropagation();
            if (node) selectOverviewNode(node);
            else useOverview.setState({ externalExpanded: true });
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (node) setOverviewHover(node.id);
          }}
          onPointerOut={() => setOverviewHover(null)}
        >
          <mesh>
            <icosahedronGeometry args={[tokens.externalRadius, 0]} />
            <meshBasicMaterial color={colors.other} transparent opacity={colors.nodeOpacity} />
            <Edges color={colors.hover} />
          </mesh>
          {index < tokens.labelBudget && (
            <SceneLabel
              name={name}
              width={tokens.externalWidth}
              colors={colors}
              position={[0, tokens.externalRadius + tokens.labelSize, 0]}
            />
          )}
        </group>
      ))}
    </>
  );
}
