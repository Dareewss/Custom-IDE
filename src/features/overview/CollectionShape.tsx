import { useOverview } from './store';
import { Edges } from '@react-three/drei';
import { collectionEntries } from '../../core/model/layout/collections';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import type { CodeNode } from '../../core/model/types';
import type { LayoutItem } from '../../core/model/layout/types';
import type { SceneColors } from './scene-tokens';
import { SceneLabel } from './SceneLabel';
import { selectOverviewNode, setOverviewHover } from './selection';

export function CollectionShape({
  node,
  item,
  colors,
  label,
}: {
  node: CodeNode;
  item: LayoutItem;
  colors: SceneColors;
  label: boolean;
}) {
  const active = useOverview(
    (state) => state.selectedNodeId === node.id || state.hoveredNodeId === node.id,
  );
  const empty = collectionEntries(node).length === 0;
  const name = `${node.name} · ${node.meta.elementCount ?? '?'} ${node.meta.collectionKind === 'dict' ? 'entries' : 'items'}`;
  return (
    <group
      position={item.position}
      onClick={(event) => {
        event.stopPropagation();
        selectOverviewNode(node);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setOverviewHover(node.id);
      }}
      onPointerOut={() => setOverviewHover(null)}
    >
      {empty && (
        <mesh
          position={[0, item.size[1] / 2 - tokens.inset - tokens.cellHeight / 2, tokens.cellOffset]}
        >
          <boxGeometry args={[tokens.leafWidth, tokens.cellHeight, tokens.cellDepth]} />
          <meshBasicMaterial color={colors.other} transparent opacity={colors.containerOpacity} />
          <Edges color={colors.other} transparent opacity={colors.rimOpacity} />
        </mesh>
      )}
      {(label || active) && (
        <SceneLabel
          nodeId={node.id}
          priority={4}
          name={name}
          width={item.size[0]}
          colors={colors}
          position={[0, item.size[1] / 2 - tokens.labelInset, item.size[2] / 2 + tokens.labelDepth]}
        />
      )}
    </group>
  );
}
