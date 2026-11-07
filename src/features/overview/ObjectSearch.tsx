import { useEffect, useMemo, useRef, useState } from 'react';
import { nodeKinds } from '../../core/model/types';
import { searchModel, type SearchKind } from '../../core/model/search';
import { useOverview } from './store';
import { selectOverviewNode } from './selection';

export function ObjectSearch() {
  const model = useOverview((s) => s.model),
    query = useOverview((s) => s.searchQuery),
    kind = useOverview((s) => s.searchKind);
  const request = useOverview((s) => s.searchFocusRequest),
    loading = useOverview((s) => s.loading);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const matches = useMemo(
    () => (model ? searchModel(model, query, kind).matches : []),
    [model, query, kind],
  );
  const results = matches.slice(0, 100),
    index = Math.min(active, results.length - 1);
  useEffect(() => {
    if (!request || loading) return;
    const frame = requestAnimationFrame(() => {
      useOverview.setState({ searchFocusRequest: 0 });
      input.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [request, loading]);
  const choose = (i: number) => {
    const node = results[i];
    if (node) {
      setOpen(false);
      selectOverviewNode(node);
    }
  };
  return (
    <div
      className="object-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className="object-search-row">
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-label="Search 3D objects"
          placeholder="Find an object…"
          value={query}
          aria-expanded={open}
          aria-controls="object-results"
          aria-autocomplete="list"
          aria-activedescendant={open && index >= 0 ? `object-result-${index}` : undefined}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setActive(0);
            useOverview.setState({ searchQuery: event.target.value.slice(0, 500) });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              useOverview.setState({ searchQuery: '', searchKind: 'all' });
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive(
                Math.max(
                  0,
                  Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                ),
              );
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              // Input/filter updates can precede a concurrent scene commit. Search the
              // latest text and store snapshot, rather than activating stale results.
              const latest = useOverview.getState();
              const text = event.currentTarget.value;
              const current = latest.model
                ? searchModel(latest.model, text, latest.searchKind).matches.slice(0, 100)
                : [];
              const target = text === query && latest.searchKind === kind ? active : 0;
              const node = current[Math.max(0, Math.min(target, current.length - 1))];
              if (node) {
                setOpen(false);
                selectOverviewNode(node);
              }
            }
          }}
        />
        <select
          aria-label="Object kind filter"
          value={kind}
          onChange={(event) => {
            setActive(0);
            setOpen(true);
            useOverview.setState({ searchKind: event.target.value as SearchKind });
          }}
        >
          <option value="all">All kinds</option>
          {nodeKinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
      </div>
      {open && (
        <div className="object-search-results">
          <p aria-live="polite">
            {matches.length} {matches.length === 1 ? 'object' : 'objects'}
            {matches.length > 100 ? ' · first 100 shown' : ''}
          </p>
          <div id="object-results" role="listbox" aria-label="3D object results">
            {results.map((node, i) => (
              <button
                type="button"
                key={node.id}
                id={`object-result-${i}`}
                role="option"
                aria-selected={index === i}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(i)}
                onPointerMove={() => setActive(i)}
              >
                <span>{node.kind}</span>
                <strong>{node.name}</strong>
                <small>{node.fileId ?? 'External'}</small>
              </button>
            ))}
          </div>
          {!matches.length && <p>No objects match this search.</p>}
        </div>
      )}
    </div>
  );
}
