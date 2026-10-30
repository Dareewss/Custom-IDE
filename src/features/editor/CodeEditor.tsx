import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { monaco } from './monaco';
import { useWorkspace } from '../explorer/store';
import { languageForPath } from '../../core/language/adapter';

export default function CodeEditor() {
  const active = useWorkspace((s) => s.active);
  const projectId = useWorkspace((s) => s.projectId);
  const tree = useWorkspace((s) => s.tree);
  const ref = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const node = active ? tree[active] : undefined;
  const onMount: OnMount = (editor) => {
    ref.current = editor;
    editor.focus();
  };
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
      theme="atlas-dark"
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
        fontSize: 14,
        lineHeight: 23,
        padding: { top: 19, bottom: 20 },
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: 'line',
        overviewRulerBorder: false,
        glyphMargin: true,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
