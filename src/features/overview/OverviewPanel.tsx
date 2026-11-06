import { lazy, Suspense, useState, useMemo } from 'react';
import { Box, ListTree, Shuffle } from 'lucide-react';
import { useProjectModel } from './useProjectModel';
import { useOverview } from './store';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';
import { IconButton } from '../../shared/IconButton';
import { Outline } from './Outline';
import { SceneBoundary } from './SceneBoundary';
import { NodeInfo } from './NodeInfo';
import { EdgeOptions } from './EdgeOptions';
import { DepthControl } from './DepthControl';
import { ObjectSearch } from './ObjectSearch';
import { IsolationBar } from './IsolationBar';
import './overview.css';

const CodeScene = lazy(() => import('./CodeScene'));

export function OverviewPanel() {
  useProjectModel();
  const state = useOverview();
  const projectId = useWorkspace((s) => s.projectId);
  const tree = useWorkspace((s) => s.tree);
  const [outline, setOutline] = useState(false);
  const current = state.projectId === projectId;
  const model = current ? state.model : null;
  const fallback = useMemo(
    () => (
      <div className="overview-fallback">
        <p aria-live="polite">3D is unavailable here. Explore the code outline.</p>
        {model && <Outline nodes={model.nodes} />}
      </div>
    ),
    [model],
  );
  return (
    <section
      className="overview-panel"
      aria-label="Code overview"
      aria-busy={state.loading}
      data-model-nodes={model?.nodes.length ?? 0}
      data-visible-nodes={state.viewModel?.nodes.length ?? 0}
      data-isolated={String(!!state.isolate)}
      data-added-nodes={state.diff.added.length}
      data-removed-nodes={state.diff.removed.length}
      data-model-revision={state.modelRevision}
      data-selected-node={state.selectedNodeId ?? ''}
      data-analysis-ms={state.analysisMs.toFixed(1)}
      data-layout-ms={state.layoutMs.toFixed(1)}
    >
      <header className="overview-toolbar">
        <span>
          <Box size={14} />
          3D overview
        </span>
        <div className="overview-actions">
          <IconButton
            label="Re-layout graph"
            disabled={state.loading}
            onClick={() => useOverview.setState({ layoutRevision: state.layoutRevision + 1 })}
          >
            <Shuffle size={14} />
          </IconButton>
          <EdgeOptions />
          <IconButton
            label="Show code outline"
            aria-pressed={outline}
            onClick={() => setOutline((value) => !value)}
          >
            <ListTree size={16} />
          </IconButton>
        </div>
      </header>
      <DepthControl />
      <ObjectSearch />
      <IsolationBar />
      {state.error && (
        <p className="overview-notice" role="alert">
          {state.error}
          {model && ' Showing the last analyzed structure.'}
        </p>
      )}
      {model && model.issues.length > 0 && (
        <p className="overview-notice" aria-live="polite">
          Some code is incomplete. Showing recovered structure.
        </p>
      )}
      <div className="overview-body" data-outline={String(outline)}>
        {!outline && <NodeInfo />}
        {!model && !state.error && (
          <p className="overview-message" aria-live="polite">
            Analyzing project…
          </p>
        )}
        {!model && state.error && (
          <div className="code-outline" aria-label="Project files">
            {Object.entries(tree)
              .filter(([, node]) => node.kind === 'file')
              .map(([path]) => (
                <button
                  key={path}
                  onClick={() => {
                    useWorkspace.getState().open(path);
                    useUI.getState().setLayout('code');
                  }}
                >
                  {path}
                </button>
              ))}
          </div>
        )}
        {model && model.nodes.length === 0 && (
          <p className="overview-message">
            No code to explore yet. Add a supported source file to this project.
          </p>
        )}
        {model &&
          model.nodes.length > 0 &&
          (outline ? (
            <>
              <Outline nodes={model.nodes} />
              <div
                className="outline-inspector"
                role="region"
                aria-label="Object details"
                tabIndex={0}
              >
                <NodeInfo />
                {!state.selectedNodeId && !state.hoveredNodeId && (
                  <p>Select an object to inspect its source.</p>
                )}
              </div>
            </>
          ) : (
            <SceneBoundary key={projectId} fallback={fallback}>
              <Suspense
                fallback={
                  <p className="overview-message" aria-live="polite">
                    Opening 3D view…
                  </p>
                }
              >
                {state.layout && (
                  <CodeScene
                    model={state.viewModel ?? model}
                    layout={state.layout}
                    unavailable={fallback}
                  />
                )}
              </Suspense>
            </SceneBoundary>
          ))}
      </div>
      <footer className="overview-footer">
        {model
          ? `${model.nodes.length} objects · ${model.edges.length} connections`
          : 'Project structure'}
        {state.loading && model && <span>Updating…</span>}
      </footer>
    </section>
  );
}
