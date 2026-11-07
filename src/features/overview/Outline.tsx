import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toggleOverviewNode } from './view-actions';
import type { CodeNode } from '../../core/model/types';
import { useOverview } from './store';
import { selectOverviewNode, setOverviewHover } from './selection';
import { outlineTree } from './outline-tree';

const rowHeight = 30,
  overscan = 6;
export function Outline({ nodes }: { nodes: CodeNode[] }) {
  const projected = useOverview((state) => state.viewModel);
  const compact = useOverview((state) => state.compactIds);
  const loading = useOverview((state) => state.loading);
  const selected = useOverview((state) => state.selectedNodeId);
  const [focus, setFocus] = useState<string | null>(null);
  const [scroll, setScroll] = useState(0),
    [height, setHeight] = useState(500);
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());
  const pendingFocus = useRef<string | null>(null);
  const typeahead = useRef({ value: '', time: 0 });
  const ordered = useMemo(
    () => outlineTree(nodes, new Set((projected?.nodes ?? nodes).map((node) => node.id))),
    [nodes, projected],
  );
  const compactSet = useMemo(() => new Set(compact), [compact]);
  const focusId = ordered.some((entry) => entry.node.id === focus) ? focus : ordered[0]?.node.id;
  const virtual = ordered.length > 200;
  const start = virtual
    ? Math.min(
        Math.max(0, ordered.length - Math.ceil(height / rowHeight)),
        Math.max(0, Math.floor(scroll / rowHeight) - overscan),
      )
    : 0;
  const end = virtual
    ? Math.min(ordered.length, start + Math.ceil(height / rowHeight) + overscan * 2)
    : ordered.length;
  const tabId = ordered.slice(start, end).some((entry) => entry.node.id === focusId)
    ? focusId
    : ordered[start]?.node.id;
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.clientHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const element = refs.current.get(pendingFocus.current);
    if (element) {
      element.focus();
      pendingFocus.current = null;
    }
  });
  const moveFocus = (index: number) => {
    const entry = ordered[index];
    if (!entry) return;
    setFocus(entry.node.id);
    const element = refs.current.get(entry.node.id);
    if (element) {
      element.focus();
      element.scrollIntoView({ block: 'nearest' });
    } else if (root.current) {
      pendingFocus.current = entry.node.id;
      root.current.scrollTop = index * rowHeight;
      setScroll(root.current.scrollTop);
    }
  };
  return (
    <div
      className="code-outline"
      role="tree"
      aria-label="Code outline"
      aria-busy={loading}
      ref={root}
      onScroll={(event) => setScroll(event.currentTarget.scrollTop)}
    >
      {virtual && <div role="presentation" style={{ height: start * rowHeight }} />}
      {ordered.slice(start, end).map(({ node, depth, position, siblings }, offset) => {
        const index = start + offset,
          collapsed = compactSet.has(node.id);
        return (
          <div
            className="outline-row"
            key={node.id}
            ref={(element) => {
              if (element) refs.current.set(node.id, element);
              else refs.current.delete(node.id);
            }}
            role="treeitem"
            data-node-id={node.id}
            aria-label={`${node.kind} ${node.name}${node.meta.hasError ? ' (incomplete)' : ''}`}
            aria-level={depth}
            aria-posinset={position}
            aria-setsize={siblings}
            aria-expanded={node.children.length ? !collapsed : undefined}
            aria-describedby={selected === node.id ? 'overview-node-info' : undefined}
            aria-selected={selected === node.id}
            tabIndex={tabId === node.id ? 0 : -1}
            style={{ paddingInlineStart: `${12 + (depth - 1) * 12}px`, height: rowHeight }}
            onFocus={() => setFocus(node.id)}
            onClick={() => selectOverviewNode(node)}
            onPointerEnter={() => setOverviewHover(node.id)}
            onPointerLeave={() => setOverviewHover(null)}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.metaKey || event.altKey) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectOverviewNode(node);
                return;
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                if (loading) return;
                if (
                  (event.key === 'ArrowLeft' && !collapsed && node.children.length) ||
                  (event.key === 'ArrowRight' && collapsed)
                )
                  toggleOverviewNode(node.id);
                else if (event.key === 'ArrowRight' && !collapsed && node.children.length)
                  moveFocus(index + 1);
                else if (event.key === 'ArrowLeft' && node.parentId)
                  moveFocus(ordered.findIndex((entry) => entry.node.id === node.parentId));
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
                moveFocus(next);
                return;
              }
              if (event.key.length === 1) {
                const time = performance.now(),
                  key = event.key.toLocaleLowerCase();
                const value =
                  time - typeahead.current.time > 700 || typeahead.current.value === key
                    ? key
                    : typeahead.current.value + key;
                typeahead.current = { value, time };
                for (let step = 1; step <= ordered.length; step++) {
                  const candidate = (index + step) % ordered.length;
                  if (ordered[candidate].node.name.toLocaleLowerCase().startsWith(value)) {
                    event.preventDefault();
                    moveFocus(candidate);
                    break;
                  }
                }
              }
            }}
          >
            {node.children.length > 0 && (
              <button
                type="button"
                tabIndex={-1}
                className="outline-toggle"
                disabled={loading}
                aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${node.kind} ${node.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleOverviewNode(node.id);
                }}
              >
                {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
            <span className="outline-kind">{node.kind}</span>
            <span>{node.name}</span>
            {node.meta.hasError && <span className="outline-error">!</span>}
          </div>
        );
      })}
      {virtual && (
        <div role="presentation" style={{ height: (ordered.length - end) * rowHeight }} />
      )}
    </div>
  );
}
