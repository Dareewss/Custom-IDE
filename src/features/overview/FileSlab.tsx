import { boxGeometry } from './resources';
import { toggleOverviewNode } from './view-actions';
import { Edges } from '@react-three/drei';
import type { CodeNode } from '../../core/model/types';
import type { LayoutItem } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';
import { SceneLabel } from './SceneLabel';
import type { SceneColors } from './scene-tokens';

export function FileSlab({
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
  const selected = useOverview((state) => state.selectedNodeId === node.id);
  const hovered = useOverview((state) => state.hoveredNodeId === node.id);
  return (
    <group
      position={item.position}
      onDoubleClick={(event) => {
        event.stopPropagation();
        toggleOverviewNode(node.id);
      }}
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
      <mesh>
        <primitive attach="geometry" object={boxGeometry(item.size)} />
        <meshBasicMaterial
          color={selected ? colors.active : colors.fill}
          transparent
          opacity={colors.containerOpacity * 0.4}
          depthWrite={false}
        />
        <Edges
          color={selected || hovered ? colors.active : colors.hover}
          transparent
          opacity={(selected ? colors.activeOpacity : colors.rimOpacity) * 0.45}
        />
      </mesh>
      {(label || selected || hovered) && (
        <SceneLabel
          nodeId={node.id}
          priority={3}
          name={`${node.name}${item.collapsed ? ' …' : ''}`}
          width={item.size[0]}
          colors={colors}
          position={[0, item.size[1] / 2 - tokens.labelInset, item.size[2] / 2 + tokens.labelDepth]}
        />
      )}
    </group>
  );
}
