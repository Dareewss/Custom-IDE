import { useRef, useState } from 'react';
import type { CodeNode } from '../../core/model/types';
import { useOverview } from './store';
import { selectOverviewNode } from './selection';

export function Outline({ nodes }: { nodes: CodeNode[] }) {
  const selected = useOverview((state) => state.selectedNodeId);
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ordered: { node: CodeNode; depth: number }[] = [];
  const pending = nodes
    .filter((node) => !node.parentId)
    .slice()
    .reverse()
    .map((node) => ({ node, depth: 1 }));
  while (pending.length) {
    const entry = pending.pop()!;
    ordered.push(entry);
    for (const id of entry.node.children.slice().reverse()) {
      const child = byId.get(id);
      if (child) pending.push({ node: child, depth: entry.depth + 1 });
    }
  }
  return (
    <div className="code-outline" role="tree" aria-label="Code outline">
      {ordered.map(({ node, depth }, index) => (
        <button
          key={node.id}
          ref={(element) => {
            refs.current[index] = element;
          }}
          role="treeitem"
          aria-label={`${node.kind} ${node.name}${node.meta.hasError ? ' (incomplete)' : ''}`}
          aria-level={depth}
          aria-selected={selected === node.id}
          tabIndex={focus === index ? 0 : -1}
          style={{ paddingInlineStart: `${12 + (depth - 1) * 12}px` }}
          onFocus={() => setFocus(index)}
          onClick={() => selectOverviewNode(node)}
          onPointerEnter={() => useOverview.setState({ hoveredNodeId: node.id })}
          onPointerLeave={() => useOverview.setState({ hoveredNodeId: null })}
          onKeyDown={(event) => {
            const next =
              event.key === 'ArrowDown'
                ? Math.min(ordered.length - 1, index + 1)
                : event.key === 'ArrowUp'
                  ? Math.max(0, index - 1)
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? ordered.length - 1
                      : undefined;
            if (next !== undefined) {
              event.preventDefault();
              setFocus(next);
              refs.current[next]?.focus();
            }
          }}
        >
          <span className="outline-kind">{node.kind}</span>
          <span>{node.name}</span>
          {node.meta.hasError && <span className="outline-error">!</span>}
        </button>
      ))}
    </div>
  );
}
