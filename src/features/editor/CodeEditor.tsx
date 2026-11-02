import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from './monaco';
import './completion';
import { useWorkspace } from '../explorer/store';
import { languageForPath } from '../../core/language/adapter';
import { useDiagnostics } from './diagnostics';
import { useLocation, useCursor } from './navigation';
import { useUI } from '../../shared/ui-store';
import { useSettings } from '../settings/store';
import { useRunner } from '../runner/store';
import { useReducedMotion } from 'motion/react';
import { glassEditorTheme } from './glass-theme';

function decorate(
  editor: monaco.editor.IStandaloneCodeEditor,
  collection: monaco.editor.IEditorDecorationsCollection,
) {
  const s = useWorkspace.getState();
  const location = useRunner.getState().pauseLocation;
  const decorations: monaco.editor.IModelDeltaDecoration[] = (
    s.breakpoints[s.active ?? ''] ?? []
  ).map((line) => ({
    range: new monaco.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      glyphMarginClassName: 'breakpoint-glyph',
      glyphMarginHoverMessage: { value: 'Breakpoint · click to remove' },
    },
  }));
  if (location?.path === s.active)
    decorations.push({
      range: new monaco.Range(location.line, 1, location.line, 1),
      options: {
        isWholeLine: true,
        className: 'execution-line',
        glyphMarginClassName: 'execution-arrow',
      },
    });
  if (editor.getModel()) collection.set(decorations);
}

export default function CodeEditor() {
  const reducedMotion = useReducedMotion();
  const active = useWorkspace((s) => s.active);
  const settings = useSettings();
  useEffect(() => {
    monaco.editor.defineTheme('atlas-glass', glassEditorTheme());
    monaco.editor.setTheme('atlas-glass');
  }, [settings.theme]);
  const projectId = useWorkspace((s) => s.projectId);
  const tree = useWorkspace((s) => s.tree);
  const tabs = useWorkspace((s) => s.tabs);
  const breakpoints = useWorkspace((s) => s.breakpoints);
  const pauseLocation = useRunner((s) => s.pauseLocation);
  const collection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const ref = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const node = active ? tree[active] : undefined;
  const diagnostics = useDiagnostics();
  const target = useLocation((s) => s.target);
  const reveal = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const location = useLocation.getState().target;
    if (location?.path === useWorkspace.getState().active) {
      editor.setPosition({ lineNumber: location.line, column: location.column });
      editor.revealLineInCenter(location.line);
      editor.focus();
    }
  };
  const onMount: OnMount = (editor) => {
    monaco.editor.defineTheme('atlas-glass', glassEditorTheme());
    monaco.editor.setTheme('atlas-glass');
    ref.current = editor;
    collection.current = editor.createDecorationsCollection();
    decorate(editor, collection.current);
    const toggle = () => {
      const s = useWorkspace.getState();
      const line = editor.getPosition()?.lineNumber;
      if (s.active && line) s.toggleBreakpoint(s.active, line);
    };
    editor.addAction({
      id: 'atlas.toggleBreakpoint',
      label: 'Toggle Breakpoint',
      keybindings: [monaco.KeyCode.F9],
      run: toggle,
    });
    editor.onMouseDown((event) => {
      if (
        event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        event.target.position
      ) {
        const s = useWorkspace.getState();
        if (s.active) s.toggleBreakpoint(s.active, event.target.position.lineNumber);
      }
    });
    editor.onDidChangeCursorPosition((event) =>
      useCursor.setState({ line: event.position.lineNumber, column: event.position.column }),
    );
    editor.focus();
    reveal(editor);
  };
  useEffect(() => {
    if (ref.current && collection.current) decorate(ref.current, collection.current);
  }, [active, breakpoints, pauseLocation]);
  useEffect(() => {
    if (ref.current && target?.path === active) reveal(ref.current);
  }, [target, active]);
  useEffect(() => {
    if (!active || node?.kind !== 'file') return;
    let cancelled = false;
    const content = node.content;
    const timer = setTimeout(() => {
      const service = languageForPath(active)?.diagnostics;
      if (service)
        void service(active, content)
          .then((items) => {
            if (!cancelled)
              useDiagnostics.setState((s) => ({ syntax: { ...s.syntax, [active]: items } }));
          })
          .catch((error: unknown) => {
            if (!cancelled) useUI.getState().reportError(error);
          });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, node]);
  useEffect(() => {
    if (!active) return;
    const model = monaco.editor.getModel(monaco.Uri.parse(`file://${projectId}/${active}`));
    if (model)
      monaco.editor.setModelMarkers(
        model,
        'atlas',
        [
          ...(diagnostics.syntax[active] ?? []),
          ...diagnostics.runtime.filter((d) => d.path === active),
        ].map((d) => ({
          startLineNumber: d.line,
          startColumn: d.column,
          endLineNumber: d.endLine,
          endColumn: d.endColumn,
          message: d.message,
          severity: monaco.MarkerSeverity.Error,
          source: d.source,
        })),
      );
  }, [active, projectId, diagnostics]);
  useEffect(
    () => () => {
      for (const model of monaco.editor.getModels()) {
        if (model.uri.authority === projectId) model.dispose();
      }
    },
    [projectId],
  );
  useEffect(() => {
    for (const model of monaco.editor.getModels()) {
      const path = model.uri.path.slice(1);
      if (
        model.uri.authority === projectId &&
        (!tabs.includes(path) || tree[path]?.kind !== 'file') &&
        !model.isAttachedToEditor()
      )
        model.dispose();
    }
  }, [projectId, tabs, tree]);
  if (!active || node?.kind !== 'file') return null;
  return (
    <Editor
      theme="atlas-glass"
      path={`file://${projectId}/${active}`}
      value={node.content}
      language={languageForPath(active)?.monacoLanguage ?? 'plaintext'}
      onMount={onMount}
      keepCurrentModel
      saveViewState
      loading={<div className="panel-empty">Loading editor…</div>}
      onChange={(value) => {
        if (value !== undefined && value !== node.content)
          useWorkspace.getState().edit(active, value);
      }}
      options={{
        fontFamily: "'Cascadia Code', 'Consolas', monospace",
        fontSize: settings.fontSize,
        lineHeight: Math.round(settings.fontSize * 1.65),
        padding: { top: 19, bottom: 20 },
        minimap: { enabled: settings.minimap },
        wordWrap: settings.wordWrap ? 'on' : 'off',
        scrollBeyondLastLine: false,
        smoothScrolling: !reducedMotion,
        cursorBlinking: reducedMotion ? 'solid' : 'smooth',
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        tabSize: settings.tabSize,
        renderLineHighlight: 'line',
        overviewRulerBorder: false,
        glyphMargin: true,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
