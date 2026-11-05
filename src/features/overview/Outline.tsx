import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toggleOverviewNode } from './view-actions';
import type { CodeNode } from '../../core/model/types';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';

export function Outline({ nodes }: { nodes: CodeNode[] }) {
  const projected = useOverview((state) => state.viewModel);
  const compact = useOverview((state) => state.compactIds);
  const loading = useOverview((state) => state.loading);
  const visible = new Set(projected?.nodes.map((node) => node.id) ?? nodes.map((node) => node.id));
  const selected = useOverview((state) => state.selectedNodeId);
  const [focus, setFocus] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ordered: { node: CodeNode; depth: number }[] = [];
  const pending = nodes
    .filter((node) => !node.parentId)
    .slice()
    .reverse()
    .map((node) => ({ node, depth: 1 }));
  while (pending.length) {
    const entry = pending.pop()!;
    if (!visible.has(entry.node.id)) continue;
    ordered.push(entry);
    for (const id of entry.node.children.slice().reverse()) {
      const child = byId.get(id);
      if (child) pending.push({ node: child, depth: entry.depth + 1 });
    }
  }
  return (
    <div className="code-outline" role="tree" aria-label="Code outline">
      {ordered.map(({ node, depth }, index) => (
        <div
          className="outline-row"
          key={node.id}
          ref={(element) => {
            refs.current[index] = element;
          }}
          role="treeitem"
          aria-label={`${node.kind} ${node.name}${node.meta.hasError ? ' (incomplete)' : ''}`}
          aria-level={depth}
          aria-expanded={node.children.length ? !compact.includes(node.id) : undefined}
          aria-selected={selected === node.id}
          tabIndex={Math.min(focus, ordered.length - 1) === index ? 0 : -1}
          style={{ paddingInlineStart: `${12 + (depth - 1) * 12}px` }}
          onFocus={() => setFocus(index)}
          onClick={() => selectOverviewNode(node)}
          onPointerEnter={() => setOverviewHover(node.id)}
          onPointerLeave={() => setOverviewHover(null)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectOverviewNode(node);
              return;
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              if (loading) return;
              const collapsed = compact.includes(node.id);
              if (
                (event.key === 'ArrowLeft' && !collapsed && node.children.length) ||
                (event.key === 'ArrowRight' && collapsed)
              )
                toggleOverviewNode(node.id);
              else if (event.key === 'ArrowRight' && !collapsed && node.children.length)
                refs.current[index + 1]?.focus();
              else if (event.key === 'ArrowLeft' && node.parentId) {
                const parent = ordered.findIndex((entry) => entry.node.id === node.parentId);
                if (parent >= 0) refs.current[parent]?.focus();
              }
              return;
            }
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
          {node.children.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              className="outline-toggle"
              disabled={loading}
              aria-label={`${compact.includes(node.id) ? 'Expand' : 'Collapse'} ${node.kind} ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                toggleOverviewNode(node.id);
              }}
            >
              {compact.includes(node.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <span className="outline-kind">{node.kind}</span>
          <span>{node.name}</span>
          {node.meta.hasError && <span className="outline-error">!</span>}
        </div>
      ))}
    </div>
  );
}
