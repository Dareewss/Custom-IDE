import type { Node } from 'web-tree-sitter';
import type { Diagnostic } from './adapter';

export function collectSyntaxErrors(root: Node, path: string): Diagnostic[] {
  const errors: Diagnostic[] = [];
  const visit = (node: Node) => {
    if (errors.length >= 100) return;
    if (node.isError || node.isMissing) {
      errors.push({
        path,
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
        endLine: node.endPosition.row + 1,
        endColumn: Math.max(node.startPosition.column + 2, node.endPosition.column + 1),
        message: node.isMissing ? `Expected ${node.type}.` : 'Invalid Python syntax.',
        source: 'Tree-sitter',
      });
      return;
    }
    if (node.hasError) for (const child of node.children) visit(child);
  };
  visit(root);
  return errors;
}
