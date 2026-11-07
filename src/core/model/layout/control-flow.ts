import type { CodeNode } from '../types';
import type { LayoutItem, Vec3 } from './types';
import { geometryTokens as tokens } from './tokens';

export interface BranchGroup {
  name: string;
  children: string[];
  width: number;
  height: number;
}
export interface BranchLane {
  name: string;
  position: Vec3;
  children: string[];
}
export function branchGroups(
  node: CodeNode,
  byId: Map<string, CodeNode>,
  sizes: Map<string, Vec3>,
): BranchGroup[] {
  const groups: [string, CodeNode['meta']['branch']][] = [
    ['True', 'true'],
    ['False', 'false'],
  ];
  if (node.meta.conditionKind === 'match') groups.splice(0, 2, ['Cases', undefined]);
  if (node.children.some((id) => byId.get(id)?.meta.branch === 'elif'))
    groups.splice(1, 0, ['Elif', 'elif']);
  if (
    node.meta.conditionKind !== 'match' &&
    node.children.some((id) => byId.get(id)?.meta.branch === undefined)
  )
    groups.push(['Test', undefined]);
  return groups.map(([name, branch]) => {
    const children = node.children.filter((id) => byId.get(id)?.meta.branch === branch);
    return {
      name,
      children,
      width: Math.max(tokens.branchMinWidth, ...children.map((id) => sizes.get(id)![0])),
      height: children.reduce((sum, id) => sum + sizes.get(id)![1] + tokens.siblingGap, 0),
    };
  });
}
export function branchDimensions(groups: BranchGroup[]): Vec3 {
  return [
    groups.reduce((sum, group) => sum + group.width, 0) +
      (groups.length - 1) * tokens.branchGap +
      tokens.inset,
    tokens.branchHeader + Math.max(tokens.leafHeight, ...groups.map((group) => group.height)),
    tokens.conditionRadius * 2,
  ];
}
export function branchLanes(groups: BranchGroup[], item: LayoutItem): BranchLane[] {
  let left = item.position[0] - item.size[0] / 2 + tokens.inset / 2;
  return groups.map((group) => {
    const lane: BranchLane = {
      name: group.name,
      children: group.children,
      position: [
        left + group.width / 2,
        item.position[1] + item.size[1] / 2 - tokens.branchLabelInset,
        item.position[2] + tokens.depthStep,
      ],
    };
    left += group.width + tokens.branchGap;
    return lane;
  });
}
/** A rectangle fits inside this ellipse even at all four body corners. */
export function loopDimensions(children: Vec3[]): Vec3 {
  const width = Math.max(tokens.leafWidth, ...children.map((size) => size[0]));
  const height = children.reduce((sum, size) => sum + size[1] + tokens.siblingGap, 0);
  return [
    width * Math.SQRT2 + tokens.inset,
    Math.max(tokens.loopMinHeight, height * Math.SQRT2 + tokens.inset * 2),
    tokens.loopTube * 2,
  ];
}
