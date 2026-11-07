import type { CodeEdge, CodeModel, CodeNode, SourceRange } from './types';

interface Position {
  line: number;
  column: number;
}
interface RangeEntry {
  id: string;
  range: SourceRange;
  depth: number;
}
export interface RangeBranch {
  entry: RangeEntry;
  maxEnd: Position;
  left: RangeBranch | null;
  right: RangeBranch | null;
}
export interface ModelIndexes {
  nodeById: Map<string, CodeNode>;
  edgesByNode: Map<string, CodeEdge[]>;
  lineToNode: Map<string, RangeBranch | null>;
}
const start = (range: SourceRange): Position => ({ line: range.startLine, column: range.startCol });
const end = (range: SourceRange): Position => ({ line: range.endLine, column: range.endCol });
const compare = (a: Position, b: Position) => a.line - b.line || a.column - b.column;

export function validateRange(range: SourceRange): void {
  if (
    ![range.startLine, range.startCol, range.endLine, range.endCol].every(
      (n) => Number.isSafeInteger(n) && n >= 1,
    ) ||
    compare(start(range), end(range)) > 0
  )
    throw new Error('Invalid source range.');
}
export function rangeContains(range: SourceRange, line: number, column: number): boolean {
  const point = { line, column };
  return compare(start(range), point) <= 0 && compare(point, end(range)) < 0;
}

function rangeTree(entries: RangeEntry[], from = 0, to = entries.length): RangeBranch | null {
  if (from >= to) return null;
  const middle = (from + to) >>> 1;
  const entry = entries[middle];
  const left = rangeTree(entries, from, middle);
  const right = rangeTree(entries, middle + 1, to);
  let maxEnd = end(entry.range);
  if (left && compare(left.maxEnd, maxEnd) > 0) maxEnd = left.maxEnd;
  if (right && compare(right.maxEnd, maxEnd) > 0) maxEnd = right.maxEnd;
  return { entry, maxEnd, left, right };
}

function nodeDepths(nodes: Map<string, CodeNode>): Map<string, number> {
  const depths = new Map<string, number>();
  for (const node of nodes.values()) {
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: string | null = node.id;
    while (current !== null && !depths.has(current)) {
      if (seen.has(current)) throw new Error('Cyclic node containment.');
      seen.add(current);
      const ancestor = nodes.get(current);
      if (!ancestor) throw new Error('Missing parent node.');
      chain.push(current);
      current = ancestor.parentId;
    }
    let depth = current === null ? -1 : depths.get(current)!;
    for (const id of chain.reverse()) depths.set(id, ++depth);
  }
  return depths;
}

export function buildModelIndexes(model: CodeModel): ModelIndexes {
  const nodeById = new Map<string, CodeNode>();
  const edgesByNode = new Map<string, CodeEdge[]>();
  for (const node of model.nodes) {
    if (nodeById.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`);
    if (node.range) validateRange(node.range);
    nodeById.set(node.id, node);
    edgesByNode.set(node.id, []);
  }
  const declaredChildren = new Set<string>();
  for (const node of model.nodes) {
    if (new Set(node.children).size !== node.children.length)
      throw new Error('Duplicate child node.');
    for (const child of node.children) {
      if (nodeById.get(child)?.parentId !== node.id) throw new Error('Invalid child containment.');
      declaredChildren.add(child);
    }
  }
  const depths = nodeDepths(nodeById);
  for (const node of model.nodes) {
    if (node.parentId !== null && !declaredChildren.has(node.id))
      throw new Error('Missing child containment.');
  }
  const edgeIds = new Set<string>();
  for (const edge of model.edges) {
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge ID: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!Number.isFinite(edge.confidence) || edge.confidence < 0 || edge.confidence > 1)
      throw new Error('Invalid edge confidence.');
    if (edge.source) validateRange(edge.source.range);
    const from = edgesByNode.get(edge.from);
    const to = edgesByNode.get(edge.to);
    if (!from || !to) throw new Error('Missing edge endpoint.');
    from.push(edge);
    if (edge.from !== edge.to) to.push(edge);
  }
  const entriesByFile = new Map<string, RangeEntry[]>();
  for (const issue of model.issues) validateRange(issue.range);
  for (const node of model.nodes) {
    if (node.kind === 'external') continue;
    const entries = entriesByFile.get(node.fileId) ?? [];
    entries.push({ id: node.id, range: node.range, depth: depths.get(node.id)! });
    entriesByFile.set(node.fileId, entries);
  }
  const lineToNode = new Map<string, RangeBranch | null>();
  for (const [fileId, entries] of entriesByFile) {
    entries.sort(
      (a, b) =>
        compare(start(a.range), start(b.range)) ||
        compare(end(a.range), end(b.range)) ||
        a.id.localeCompare(b.id),
    );
    lineToNode.set(fileId, rangeTree(entries));
  }
  return { nodeById, edgesByNode, lineToNode };
}

function preferred(candidate: RangeEntry, previous: RangeEntry): boolean {
  const a = candidate.range;
  const b = previous.range;
  return (
    a.endLine - a.startLine < b.endLine - b.startLine ||
    (a.endLine - a.startLine === b.endLine - b.startLine &&
      (a.endCol - a.startCol < b.endCol - b.startCol ||
        (a.endCol - a.startCol === b.endCol - b.startCol &&
          (candidate.depth > previous.depth ||
            (candidate.depth === previous.depth && candidate.id < previous.id)))))
  );
}

/** O(log n + overlapping ranges), without expanding every multiline node into all its lines. */
export function nodeAtPosition(
  indexes: ModelIndexes,
  fileId: string,
  line: number,
  column?: number,
): CodeNode | undefined {
  if (
    !Number.isSafeInteger(line) ||
    line < 1 ||
    (column !== undefined && (!Number.isSafeInteger(column) || column < 1))
  )
    return;
  const lower = { line, column: column ?? 1 };
  const upper = column === undefined ? { line: line + 1, column: 1 } : lower;
  let best: RangeEntry | undefined;
  const visit = (branch: RangeBranch | null) => {
    if (!branch || compare(branch.maxEnd, lower) <= 0) return;
    visit(branch.left);
    const range = branch.entry.range;
    const beforeUpper =
      column === undefined ? compare(start(range), upper) < 0 : compare(start(range), upper) <= 0;
    if (!beforeUpper) return;
    const matches =
      column === undefined
        ? compare(start(range), end(range)) < 0 && compare(end(range), lower) > 0
        : rangeContains(range, line, column);
    if (matches && (!best || preferred(branch.entry, best))) best = branch.entry;
    visit(branch.right);
  };
  visit(indexes.lineToNode.get(fileId) ?? null);
  return best ? indexes.nodeById.get(best.id) : undefined;
}
