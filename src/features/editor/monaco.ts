import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { conf, language } from 'monaco-editor/languages/definitions/python/python.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
monaco.languages.register({ id: 'python', extensions: ['.py', '.pyw'] });
monaco.languages.setLanguageConfiguration('python', conf);
monaco.languages.setMonarchTokensProvider('python', language);
monaco.editor.defineTheme('atlas-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '738d7d' },
    { token: 'keyword', foreground: 'c4a1db' },
    { token: 'string', foreground: 'a5c99b' },
    { token: 'number', foreground: 'd6b98a' },
  ],
  colors: {
    'editor.background': '#111416',
    'editor.foreground': '#d8dfe3',
    'editorLineNumber.foreground': '#56646c',
    'editorLineNumber.activeForeground': '#b6c2c9',
    'editor.lineHighlightBackground': '#ffffff04',
    'editor.selectionBackground': '#91d4ae25',
    'editorCursor.foreground': '#91d4ae',
    'editorIndentGuide.background1': '#293136',
  },
});
export { monaco };
