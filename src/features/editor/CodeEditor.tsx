import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from './monaco';
import './completion';
import { useWorkspace } from '../explorer/store';
import { languageForPath } from '../../core/language/adapter';
import { useDiagnostics } from './diagnostics';
import { useLocation } from './navigation';
import { useUI } from '../../shared/ui-store';
import { useSettings } from '../settings/store';

export default function CodeEditor() {
  const active = useWorkspace((s) => s.active);
  const settings = useSettings();
  const projectId = useWorkspace((s) => s.projectId);
  const tree = useWorkspace((s) => s.tree);
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
    ref.current = editor;
    editor.focus();
    reveal(editor);
  };
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
  if (!active || node?.kind !== 'file') return null;
  return (
    <Editor
      theme={settings.theme === 'dark' ? 'atlas-dark' : 'vs'}
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
        smoothScrolling: true,
        cursorBlinking: 'smooth',
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
