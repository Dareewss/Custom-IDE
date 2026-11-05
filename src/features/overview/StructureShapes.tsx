import { toggleOverviewNode } from './view-actions';
import { valueColor } from './value-colors';
import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { CodeNode } from '../../core/model/types';
import type { LayoutItem } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { functionWidth, headerPosition } from '../../core/model/layout/metrics';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';
import type { SceneColors } from './scene-tokens';
import { SceneLabel } from './SceneLabel';

interface ShapeProps {
  node: CodeNode;
  item: LayoutItem;
  colors: SceneColors;
  label: boolean;
}
function useNodeEvents(node: CodeNode) {
  const selected = useOverview((state) => state.selectedNodeId === node.id);
  const hovered = useOverview((state) => state.hoveredNodeId === node.id);
  return {
    selected,
    hovered,
    events: {
      onDoubleClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        toggleOverviewNode(node.id);
      },
      onClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        selectOverviewNode(node);
      },
      onPointerOver: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setOverviewHover(node.id);
      },
      onPointerOut: () => setOverviewHover(null),
    },
  };
}
export function ClassBlock({ node, item, colors, label }: ShapeProps) {
  const { selected, hovered, events } = useNodeEvents(node);
  return (
    <group position={item.position} {...events}>
      <mesh>
        <boxGeometry args={item.size} />
        <meshBasicMaterial
          color={node.meta.hasError ? colors.error : colors.classFill}
          transparent
          opacity={colors.containerOpacity}
          depthWrite={false}
        />
        <Edges
          color={selected || hovered ? colors.active : colors.classFill}
          transparent
          opacity={selected ? colors.activeOpacity : colors.rimOpacity}
        />
      </mesh>
      {label && (
        <SceneLabel
          name={`${node.name}${item.collapsed ? ' …' : ''}`}
          width={item.size[0]}
          colors={colors}
          position={[0, item.size[1] / 2 - tokens.labelInset, item.size[2] / 2 + tokens.labelDepth]}
        />
      )}
    </group>
  );
}
export function FunctionCapsule({ node, item, colors, label }: ShapeProps) {
  const { selected, hovered, events } = useNodeEvents(node);
  const width = functionWidth(node, node.meta.params?.length ?? 0);
  return (
    <group position={headerPosition(item)} {...events}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry
          args={[
            tokens.functionRadius,
            width - tokens.functionRadius * 2,
            tokens.functionCapSegments,
            tokens.functionRadialSegments,
          ]}
        />
        <meshBasicMaterial
          color={
            node.meta.hasError
              ? colors.error
              : selected || hovered
                ? colors.active
                : colors.functionFill
          }
          transparent
          opacity={selected ? colors.activeOpacity : colors.nodeOpacity}
          depthWrite={false}
        />
        <Edges color={colors.active} transparent opacity={colors.rimOpacity} />
      </mesh>
      {label && (
        <SceneLabel
          name={`${node.name}${item.collapsed ? ' …' : ''}`}
          width={width}
          colors={colors}
          position={[0, 0, tokens.functionRadius + tokens.labelDepth]}
        />
      )}
    </group>
  );
}
export function ParameterPort({ node, item, colors }: Omit<ShapeProps, 'label'>) {
  const { selected, hovered, events } = useNodeEvents(node);
  return (
    <group position={item.position} {...events}>
      <mesh>
        <sphereGeometry args={[tokens.portRadius, tokens.portSegments, tokens.portSegments]} />
        <meshBasicMaterial
          color={selected || hovered ? colors.active : valueColor(node.meta.valueType, colors)}
          transparent
          opacity={colors.valueOpacity}
        />
      </mesh>
      {(selected || hovered) && (
        <SceneLabel
          name={`${node.name}${node.meta.typeHint ? `: ${node.meta.typeHint}` : ''}`}
          width={tokens.leafWidth}
          colors={colors}
          position={[0, tokens.portRadius + tokens.labelSize, tokens.labelDepth]}
        />
      )}
    </group>
  );
}
