import type { CodeModel, CodeNode } from '../../core/model/types';
import type { ModelIndexes } from '../../core/model/indexes';
import { lineSpan } from '../../core/model/layout/line-map';

export function nodeDetails(node: CodeNode, model: CodeModel, indexes: ModelIndexes) {
  const count = (entry: CodeNode | undefined) => {
    if (!entry?.range) return 0;
    const [start, end] = lineSpan(entry.range);
    return end - start;
  };
  const lines = count(node),
    parentLines = count(indexes.nodeById.get(node.parentId ?? ''));
  const calls = (indexes.edgesByNode.get(node.id) ?? []).filter((edge) => edge.kind === 'call');
  return {
    lines,
    share: parentLines ? Math.min(100, Math.round((lines / parentLines) * 100)) : null,
    children: node.children.length,
    callers: calls.filter((edge) => edge.to === node.id),
    callees: calls.filter((edge) => edge.from === node.id),
    diagnostics: model.issues.filter(
      (issue) =>
        issue.fileId === node.fileId &&
        node.range &&
        (issue.range.startLine < node.range.endLine ||
          (issue.range.startLine === node.range.endLine &&
            issue.range.startCol < node.range.endCol)) &&
        (issue.range.endLine > node.range.startLine ||
          (issue.range.endLine === node.range.startLine &&
            issue.range.endCol > node.range.startCol)),
    ),
  };
}
