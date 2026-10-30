import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import { conf, language } from 'monaco-editor/languages/definitions/python/python.js';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController.js';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2.js';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching.js';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution.js';
import 'monaco-editor/editor/contrib/find/browser/findController.js';
import 'monaco-editor/editor/contrib/folding/browser/folding.js';
import 'monaco-editor/editor/contrib/contextmenu/browser/contextmenu.js';
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard.js';
import 'monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode.js';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
monaco.languages.register({ id: 'python', extensions: ['.py', '.pyw'] });
monaco.languages.setLanguageConfiguration('python', conf);
monaco.languages.setMonarchTokensProvider('python', language);
monaco.languages.registerCompletionItemProvider('python', {
  provideCompletionItems(model, position) {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };
    return {
      suggestions: [
        { label: 'def', body: 'def ${1:name}(${2:args}):\n\t${0:pass}' },
        { label: 'for', body: 'for ${1:item} in ${2:items}:\n\t${0:pass}' },
        { label: 'class', body: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${0:pass}' },
        { label: 'ifmain', body: 'if __name__ == "__main__":\n\t${0:main()}' },
      ].map(({ label, body }) => ({
        label,
        insertText: body,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
      })),
    };
  },
});
monaco.editor.defineTheme('atlas-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '8b939c' },
    { token: 'keyword', foreground: 'ff809a' },
    { token: 'string', foreground: 'e5d8bc' },
    { token: 'number', foreground: 'c3b4e6' },
    { token: 'predefined', foreground: 'b7c7e5' },
    { token: 'type.identifier', foreground: 'b9bad3' },
    { token: 'operator', foreground: 'ff809a' },
    { token: 'annotation', foreground: 'bdc8df' },
  ],
  colors: {
    'editor.background': '#00000000',
    'editor.foreground': '#eeeff2',
    'editorGutter.background': '#00000000',
    'editorLineNumber.foreground': '#8b939c',
    'editorLineNumber.activeForeground': '#d9dce3',
    'editor.lineHighlightBackground': '#59546c24',
    'editor.selectionBackground': '#59546c85',
    'editorCursor.foreground': '#ff0035',
    'editorIndentGuide.background1': '#ffffff12',
  },
});
export { monaco };
