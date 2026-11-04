import { Edges, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { CodeNode } from '../../core/model/types';
import type { BranchLane } from '../../core/model/layout/control-flow';
import type { LayoutItem } from '../../core/model/layout/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import { headerPosition } from '../../core/model/layout/metrics';
import type { SceneColors } from './scene-tokens';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';
import { SceneLabel } from './SceneLabel';

interface Props {
  node: CodeNode;
  item: LayoutItem;
  colors: SceneColors;
  label: boolean;
  lanes?: BranchLane[];
}
export function ControlFlowShape({ node, item, colors, label, lanes = [] }: Props) {
  const active = useOverview(
    (state) => state.selectedNodeId === node.id || state.hoveredNodeId === node.id,
  );
  const color = node.meta.hasError ? colors.error : active ? colors.active : colors.functionFill;
  const loop = node.kind === 'loop';
  const header = headerPosition(item);
  const events = {
    onClick: (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      selectOverviewNode(node);
    },
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setOverviewHover(node.id);
    },
    onPointerOut: () => setOverviewHover(null),
  };
  return (
    <group {...events}>
      {loop ? (
        <mesh position={item.position} scale={[item.size[0] / 2, item.size[1] / 2, 1]}>
          <torusGeometry
            args={[1, tokens.loopTube, tokens.loopRadialSegments, tokens.loopTubularSegments]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={active ? colors.activeOpacity : colors.rimOpacity}
          />
        </mesh>
      ) : (
        <mesh position={header}>
          <octahedronGeometry args={[tokens.conditionRadius, 0]} />
          <meshBasicMaterial color={color} transparent opacity={colors.nodeOpacity} />
          <Edges color={color} />
        </mesh>
      )}
      {label && (
        <SceneLabel
          name={
            loop
              ? `${node.meta.loopKind ?? 'loop'} · ${node.name}`
              : `${node.name} · ${node.meta.branchCount ?? 2} branches`
          }
          width={item.size[0]}
          colors={colors}
          position={[
            item.position[0],
            loop
              ? item.position[1] + item.size[1] / 2 - tokens.labelInset
              : header[1] + tokens.labelInset,
            item.position[2] + tokens.labelDepth + tokens.conditionRadius,
          ]}
        />
      )}
      {!loop &&
        lanes.map((lane) => (
          <group key={lane.name}>
            <Line
              points={[
                [header[0], header[1] - tokens.conditionRadius, header[2]],
                [lane.position[0], lane.position[1], lane.position[2]],
              ]}
              color={color}
              lineWidth={tokens.branchLineWidth}
              transparent
              opacity={colors.rimOpacity}
            />
            {label && (
              <SceneLabel
                name={`${lane.name}${lane.children.length ? '' : ' · empty'}`}
                width={tokens.branchMinWidth}
                colors={colors}
                position={lane.position}
              />
            )}
          </group>
        ))}
    </group>
  );
}
