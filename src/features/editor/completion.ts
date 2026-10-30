import { python, type Completion } from '../../core/language/adapter';
import { WorkerClient } from '../../core/workers/client';
import type { CompletionRequest } from '../../core/workers/language.worker';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';
import { monaco } from './monaco';

const client = new WorkerClient<CompletionRequest, Completion[]>(
  () =>
    new Worker(new URL('../../core/workers/language.worker.ts', import.meta.url), {
      type: 'module',
    }),
);
python.completion = (path, content, line, column) =>
  client.call({ path, content, line, column, tree: useWorkspace.getState().tree });
monaco.languages.registerCompletionItemProvider('python', {
  triggerCharacters: ['.'],
  async provideCompletionItems(model, position, _context, token) {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };
    const path = model.uri.path.slice(1);
    try {
      const items = await python.completion!(
        path,
        model.getValue(),
        position.lineNumber,
        position.column,
      );
      if (token.isCancellationRequested) return { suggestions: [] };
      return {
        suggestions: items.map((item) => ({
          label: item.label,
          insertText: item.insertText,
          detail: item.detail,
          kind:
            item.kind === 'function'
              ? monaco.languages.CompletionItemKind.Function
              : item.kind === 'class'
                ? monaco.languages.CompletionItemKind.Class
                : monaco.languages.CompletionItemKind.Variable,
          range,
        })),
      };
    } catch (error) {
      useUI.getState().reportError(`Autocomplete unavailable: ${String(error)}`);
      return { suggestions: [] };
    }
  },
});
